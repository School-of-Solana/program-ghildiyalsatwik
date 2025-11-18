import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { VaultManager } from "../target/types/vault_manager";

const TOKEN_2022_PROGRAM_ID = new anchor.web3.PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);
const TRANSFER_HOOK_PROGRAM_ID = new anchor.web3.PublicKey(
  "tDGxsLSWHUQ678asjwp1UTdtPq5VFw9NNFDskxcsBdR"
);
const BASE_MINT_SIZE = 82;
const TRANSFER_HOOK_MINT_SIZE = BASE_MINT_SIZE + 83 + 1 + 2 + 2 + 64;
const TOKEN_INSTRUCTION_TRANSFER_HOOK = 36;
const TRANSFER_HOOK_INSTRUCTION_INITIALIZE = 0;

type VaultFixture = {
  user: anchor.web3.Keypair;
  inheritors: { address: anchor.web3.PublicKey; amount: anchor.BN }[];
  vaultStatePda: anchor.web3.PublicKey;
  vaultSolPda: anchor.web3.PublicKey;
  lvsolMint: anchor.web3.PublicKey;
  userLvsolAta: anchor.web3.PublicKey;
  amountLamports: anchor.BN;
  rewardLamports: anchor.BN;
  inactivityDuration: anchor.BN;
};

describe("vault_manager", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultManager as Program<VaultManager>;
  const connection = provider.connection;
  const systemProgram = anchor.web3.SystemProgram.programId;

  async function requestAirdrop(pubkey: anchor.web3.PublicKey, sol: number) {
    const signature = await connection.requestAirdrop(
      pubkey,
      sol * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature, "confirmed");
  }

  async function createToken2022Mint(
    mintAuthority: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    const mintKeypair = anchor.web3.Keypair.generate();
    const lamports = await connection.getMinimumBalanceForRentExemption(
      TRANSFER_HOOK_MINT_SIZE
    );

    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: TRANSFER_HOOK_MINT_SIZE,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID
      }),
      createInitializeTransferHookInstruction(
        mintKeypair.publicKey,
        mintAuthority,
        TRANSFER_HOOK_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        9,
        mintAuthority,
        null
      )
    );

    await provider.sendAndConfirm(tx, [mintKeypair]);
    return mintKeypair.publicKey;
  }

  function createInitializeMintInstruction(
    mint: anchor.web3.PublicKey,
    decimals: number,
    mintAuthority: anchor.web3.PublicKey,
    freezeAuthority: anchor.web3.PublicKey | null
  ) {
    const data = Buffer.alloc(1 + 1 + 32 + 1 + (freezeAuthority ? 32 : 0));
    data[0] = 0;
    data[1] = decimals;
    mintAuthority.toBuffer().copy(data, 2);
    if (freezeAuthority) {
      data[34] = 1;
      freezeAuthority.toBuffer().copy(data, 35);
    } else {
      data[34] = 0;
    }

    return new anchor.web3.TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        {
          pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false
        }
      ],
      data
    });
  }

  function createInitializeTransferHookInstruction(
    mint: anchor.web3.PublicKey,
    authority: anchor.web3.PublicKey,
    transferHookProgramId: anchor.web3.PublicKey
  ) {
    const data = Buffer.alloc(1 + 1 + 32 + 32);
    data[0] = TOKEN_INSTRUCTION_TRANSFER_HOOK;
    data[1] = TRANSFER_HOOK_INSTRUCTION_INITIALIZE;
    authority.toBuffer().copy(data, 2);
    transferHookProgramId.toBuffer().copy(data, 34);

    return new anchor.web3.TransactionInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      keys: [{ pubkey: mint, isSigner: false, isWritable: true }],
      data
    });
  }

  function getAssociatedTokenAddress(
    mint: anchor.web3.PublicKey,
    owner: anchor.web3.PublicKey
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      anchor.utils.token.ASSOCIATED_PROGRAM_ID
    )[0];
  }

  async function setupVault(
    opts?: Partial<{
      depositSol: number;
      rewardSol: number;
      inactivitySeconds: number;
      inheritorPercents: number[];
    }>
  ): Promise<VaultFixture> {
    const {
      depositSol = 1,
      rewardSol = 0.1,
      inactivitySeconds = 60,
      inheritorPercents = [10000]
    } = opts || {};

    const user = anchor.web3.Keypair.generate();
    await requestAirdrop(user.publicKey, 4);

    const [vaultStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );
    const [vaultSolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault-sol"), user.publicKey.toBuffer()],
      program.programId
    );

    const lvsolMint = await createToken2022Mint(vaultSolPda);
    const userLvsolAta = getAssociatedTokenAddress(lvsolMint, user.publicKey);

    const inheritors = inheritorPercents.map(percent => ({
      address: anchor.web3.Keypair.generate().publicKey,
      amount: new anchor.BN(percent)
    }));

    const amountLamports = new anchor.BN(
      Math.round(depositSol * anchor.web3.LAMPORTS_PER_SOL)
    );
    const rewardLamports = new anchor.BN(
      Math.round(rewardSol * anchor.web3.LAMPORTS_PER_SOL)
    );
    const inactivityDuration = new anchor.BN(Math.floor(inactivitySeconds));

    await program.methods
      .initialize(amountLamports, rewardLamports, inactivityDuration, inheritors)
      .accounts({
        user: user.publicKey,
        vaultState: vaultStatePda,
        vaultPda: vaultSolPda,
        lvsolMint,
        userLvsolAta,
        systemProgram,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID
      })
      .signers([user])
      .rpc();

    return {
      user,
      inheritors,
      vaultStatePda,
      vaultSolPda,
      lvsolMint,
      userLvsolAta,
      amountLamports,
      rewardLamports,
      inactivityDuration
    };
  }

  async function getTokenAmount(account: anchor.web3.PublicKey) {
    const balance = await connection.getTokenAccountBalance(account);
    return Number(balance.value.amount);
  }

  describe("initialize", () => {
    it("locks SOL and mints lvSOL for user", async () => {
      const fixture = await setupVault({ inactivitySeconds: 1 });

      const vaultBalance = await connection.getBalance(fixture.vaultSolPda);
      assert.strictEqual(vaultBalance, fixture.amountLamports.toNumber());

      const tokenBalance = await getTokenAmount(fixture.userLvsolAta);
      assert.strictEqual(tokenBalance, fixture.amountLamports.toNumber());

      const vaultState = await program.account.vaultState.fetch(
        fixture.vaultStatePda
      );
      assert.strictEqual(
        vaultState.lockedAmount.toNumber(),
        fixture.amountLamports.toNumber()
      );
      assert.strictEqual(
        vaultState.rewardLamports.toNumber(),
        fixture.rewardLamports.toNumber()
      );
      assert.strictEqual(
        vaultState.inactivityDuration.toNumber(),
        fixture.inactivityDuration.toNumber()
      );
    });
  });

  describe("add_sol", () => {
    it("adds lamports to vault PDA", async () => {
      const fixture = await setupVault();
      const additional = anchor.web3.LAMPORTS_PER_SOL / 2;

      const before = await connection.getBalance(fixture.vaultSolPda);
      await program.methods
        .addSol(new anchor.BN(additional))
        .accounts({
          user: fixture.user.publicKey,
          vaultPda: fixture.vaultSolPda,
          systemProgram
        })
        .signers([fixture.user])
        .rpc();

      const after = await connection.getBalance(fixture.vaultSolPda);
      assert.strictEqual(after - before, additional);
    });

    it("fails when incorrect vault PDA is provided", async () => {
      const fixture = await setupVault();
      const wrongVault = anchor.web3.Keypair.generate().publicKey;

      try {
        await program.methods
          .addSol(new anchor.BN(1_000_000))
          .accounts({
            user: fixture.user.publicKey,
            vaultPda: wrongVault,
            systemProgram
          })
          .signers([fixture.user])
          .rpc();
        assert.fail("Expected constraint error");
      } catch (err: any) {
        assert.include(err.message, "ConstraintSeeds");
      }
    });
  });

  describe("ping", () => {
    it("updates last active timestamp for the owner", async () => {
      const fixture = await setupVault();
      const before = await program.account.vaultState.fetch(
        fixture.vaultStatePda
      );

      await program.methods
        .ping()
        .accounts({
          owner: fixture.user.publicKey,
          vaultState: fixture.vaultStatePda
        })
        .signers([fixture.user])
        .rpc();

      const after = await program.account.vaultState.fetch(
        fixture.vaultStatePda
      );
      assert.isTrue(after.lastActiveTimestamp.gt(before.lastActiveTimestamp));
    });

    it("rejects non owners", async () => {
      const fixture = await setupVault();
      const intruder = anchor.web3.Keypair.generate();
      await requestAirdrop(intruder.publicKey, 1);

      try {
        await program.methods
          .ping()
          .accounts({
            owner: intruder.publicKey,
            vaultState: fixture.vaultStatePda
          })
          .signers([intruder])
          .rpc();
        assert.fail("Expected UnauthorizedUser error");
      } catch (err: any) {
        assert.include(err.message, "You are not the owner of this vault");
      }
    });
  });

  describe("redeem", () => {
    it("lets owner redeem partial amount of SOL", async () => {
      const fixture = await setupVault();
      const redeemAmount = fixture.amountLamports.div(new anchor.BN(2));

      const userBefore = await connection.getBalance(fixture.user.publicKey);
      const vaultBefore = await connection.getBalance(fixture.vaultSolPda);

      await program.methods
        .redeem(redeemAmount)
        .accounts({
          redeemer: fixture.user.publicKey,
          vaultState: fixture.vaultStatePda,
          vaultPda: fixture.vaultSolPda,
          lvsolMint: fixture.lvsolMint,
          redeemerLvsolAccount: fixture.userLvsolAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram
        })
        .signers([fixture.user])
        .rpc();

      const userAfter = await connection.getBalance(fixture.user.publicKey);
      const vaultAfter = await connection.getBalance(fixture.vaultSolPda);
      const tokenBalance = await getTokenAmount(fixture.userLvsolAta);

      assert.strictEqual(
        userAfter - userBefore > redeemAmount.toNumber() - 5_000,
        true,
        "Redeemer should receive SOL less fees"
      );
      assert.strictEqual(vaultBefore - vaultAfter, redeemAmount.toNumber());
      assert.strictEqual(
        tokenBalance,
        fixture.amountLamports.sub(redeemAmount).toNumber()
      );

      const state = await program.account.vaultState.fetch(
        fixture.vaultStatePda
      );
      assert.strictEqual(
        state.lockedAmount.toNumber(),
        fixture.amountLamports.sub(redeemAmount).toNumber()
      );
    });

    it("fails when redeeming more than balance", async () => {
      const fixture = await setupVault();
      const tooMuch = fixture.amountLamports.mul(new anchor.BN(2));

      try {
        await program.methods
          .redeem(tooMuch)
          .accounts({
            redeemer: fixture.user.publicKey,
            vaultState: fixture.vaultStatePda,
            vaultPda: fixture.vaultSolPda,
            lvsolMint: fixture.lvsolMint,
            redeemerLvsolAccount: fixture.userLvsolAta,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram
          })
          .signers([fixture.user])
          .rpc();
        assert.fail("expected failure");
      } catch (err: any) {
        assert.include(err.message, "insufficient funds");
      }
    });
  });

  describe("trigger inheritance", () => {
    it("pays caller reward and distributes to inheritors", async () => {
      const fixture = await setupVault({
        inactivitySeconds: 0,
        rewardSol: 0.05
      });
      const caller = anchor.web3.Keypair.generate();
      await requestAirdrop(caller.publicKey, 1);
      const inheritorKey = fixture.inheritors[0].address;

      const callerBefore = await connection.getBalance(caller.publicKey);
      const inheritorBefore = await connection.getBalance(inheritorKey);

      await program.methods
        .triggerInheritance()
        .accounts({
          caller: caller.publicKey,
          vaultState: fixture.vaultStatePda,
          vaultPda: fixture.vaultSolPda,
          lvsolMint: fixture.lvsolMint,
          ownerLvsolAccount: fixture.userLvsolAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram
        })
        .signers([caller])
        .rpc();

      const callerAfter = await connection.getBalance(caller.publicKey);
      const inheritorAfter = await connection.getBalance(inheritorKey);
      const rewardLamports = fixture.rewardLamports.toNumber();

      assert.strictEqual(
        callerAfter - callerBefore > rewardLamports - 5_000,
        true
      );
      assert.strictEqual(
        inheritorAfter - inheritorBefore,
        fixture.amountLamports.sub(fixture.rewardLamports).toNumber()
      );

      const state = await program.account.vaultState.fetch(
        fixture.vaultStatePda
      );
      assert.strictEqual(state.lockedAmount.toNumber(), 0);
    });

    it("rejects trigger while vault still active", async () => {
      const fixture = await setupVault({ inactivitySeconds: 3600 });
      const watcher = anchor.web3.Keypair.generate();
      await requestAirdrop(watcher.publicKey, 1);

      try {
        await program.methods
          .triggerInheritance()
          .accounts({
            caller: watcher.publicKey,
            vaultState: fixture.vaultStatePda,
            vaultPda: fixture.vaultSolPda,
            lvsolMint: fixture.lvsolMint,
            ownerLvsolAccount: fixture.userLvsolAta,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram
          })
          .signers([watcher])
          .rpc();
        assert.fail("expected inactivity error");
      } catch (err: any) {
        assert.include(err.message, "Vault is still active");
      }
    });
  });
});
