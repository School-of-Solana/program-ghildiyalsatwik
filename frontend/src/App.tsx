import { useCallback, useEffect, useMemo, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import rawIdl from "./idl/vault_manager.json";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  DEFAULT_LVSOL_MINT,
  PROGRAM_ID,
  RPC_ENDPOINT,
  TOKEN_2022_PROGRAM_ID
} from "./config";

const LAMPORTS_PER_SOL = anchor.web3.LAMPORTS_PER_SOL;

const connection = new Connection(RPC_ENDPOINT, "confirmed");

const baseIdl = rawIdl as anchor.Idl;
const patchedIdl: anchor.Idl = {
  ...baseIdl,
  accounts: []
};

const toLamports = (value: number) => {
  if (Number.isNaN(value) || value <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return new anchor.BN(Math.round(value * LAMPORTS_PER_SOL));
};

const basisPointsFromPercent = (value: number) => {
  if (Number.isNaN(value) || value < 0) {
    throw new Error("Invalid inheritor percentage");
  }
  return new anchor.BN(Math.round(value * 100));
};

const deriveVaultAddresses = (owner: PublicKey) => {
  const [vaultStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    PROGRAM_ID
  );
  const [vaultSolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault-sol"), owner.toBuffer()],
    PROGRAM_ID
  );
  return { vaultStatePda, vaultSolPda };
};

const getAta = (owner: PublicKey, mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

const explorerUrl = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

function App() {
  const [walletKey, setWalletKey] = useState<PublicKey | null>(null);
  const [lvsolMintInput, setLvsolMintInput] = useState<string>(DEFAULT_LVSOL_MINT);
  const [triggerMint, setTriggerMint] = useState<string>(DEFAULT_LVSOL_MINT);
  const [depositSol, setDepositSol] = useState(1);
  const [rewardSol, setRewardSol] = useState(0.1);
  const [inactivitySeconds, setInactivitySeconds] = useState(86400);
  const [inheritorsText, setInheritorsText] = useState("");
  const [addAmountSol, setAddAmountSol] = useState(0.1);
  const [redeemAmountSol, setRedeemAmountSol] = useState(0.1);
  const [triggerOwner, setTriggerOwner] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  useEffect(() => {
    if (walletKey) {
      setTriggerOwner(walletKey.toBase58());
    }
  }, [walletKey]);

  useEffect(() => {
    if (!triggerMint) {
      setTriggerMint(lvsolMintInput);
    }
  }, [lvsolMintInput, triggerMint]);

  const walletAdapter = useMemo<anchor.Wallet | null>(() => {
    if (!walletKey || !window.solana) return null;
    const provider = window.solana;
    return {
      publicKey: walletKey,
      signTransaction: (tx: anchor.web3.Transaction) => provider.signTransaction(tx),
      signAllTransactions: (txs: anchor.web3.Transaction[]) =>
        provider.signAllTransactions(txs)
    };
  }, [walletKey]);

  const anchorProvider = useMemo(() => {
    if (!walletAdapter) return null;
    return new anchor.AnchorProvider(connection, walletAdapter, {
      commitment: "confirmed"
    });
  }, [walletAdapter]);

  const program = useMemo(() => {
    if (!anchorProvider) return null;
    return new anchor.Program(patchedIdl, PROGRAM_ID, anchorProvider);
  }, [anchorProvider]);

  const connectWallet = useCallback(async () => {
    if (!window.solana?.isPhantom) {
      alert("Install the Phantom wallet extension to continue.");
      return;
    }
    try {
      const response = await window.solana.connect();
      setWalletKey(response.publicKey);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await window.solana?.disconnect();
      setWalletKey(null);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const parseInheritors = () => {
    if (!inheritorsText.trim()) return [];
    return inheritorsText
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [address, pct] = line.split(":").map(part => part.trim());
        if (!address || !pct) {
          throw new Error("Each inheritor line must be 'address:percent'");
        }
        const pubkey = new PublicKey(address);
        const percent = Number(pct);
        return {
          address: pubkey,
          amount: basisPointsFromPercent(percent)
        };
      });
  };

  const run = async (action: () => Promise<string>) => {
    setStatus("Sending transaction...");
    setTxSignature(null);
    try {
      const sig = await action();
      setStatus("Success! View the transaction below.");
      setTxSignature(sig);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Error: ${message}`);
    }
  };

  const ensureProgram = () => {
    if (!program || !walletKey) {
      throw new Error("Connect your wallet to continue.");
    }
    return program;
  };

  const handleInitialize = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const programInstance = ensureProgram();
      if (!lvsolMintInput) {
        throw new Error("Provide the lvSOL mint address you deployed on devnet.");
      }
      const mint = new PublicKey(lvsolMintInput);
      const inheritors = parseInheritors();
      const { vaultStatePda, vaultSolPda } = deriveVaultAddresses(walletKey!);
      const userAta = getAta(walletKey!, mint);
      return programInstance.methods
        .initialize(
          toLamports(depositSol),
          toLamports(rewardSol),
          new anchor.BN(Math.round(inactivitySeconds)),
          inheritors
        )
        .accounts({
          user: walletKey!,
          vaultState: vaultStatePda,
          vaultPda: vaultSolPda,
          lvsolMint: mint,
          userLvsolAta: userAta,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
        })
        .rpc();
    });
  };

  const handleAddSol = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const programInstance = ensureProgram();
      const { vaultSolPda } = deriveVaultAddresses(walletKey!);
      return programInstance.methods
        .addSol(toLamports(addAmountSol))
        .accounts({
          user: walletKey!,
          vaultPda: vaultSolPda,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
    });
  };

  const handlePing = async () => {
    await run(async () => {
      const programInstance = ensureProgram();
      const { vaultStatePda } = deriveVaultAddresses(walletKey!);
      return programInstance.methods
        .ping()
        .accounts({ owner: walletKey!, vaultState: vaultStatePda })
        .rpc();
    });
  };

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const programInstance = ensureProgram();
      if (!lvsolMintInput) {
        throw new Error("Provide the lvSOL mint used by this vault.");
      }
      const mint = new PublicKey(lvsolMintInput);
      const { vaultStatePda, vaultSolPda } = deriveVaultAddresses(walletKey!);
      const redeemerAta = getAta(walletKey!, mint);
      return programInstance.methods
        .redeem(toLamports(redeemAmountSol))
        .accounts({
          redeemer: walletKey!,
          vaultState: vaultStatePda,
          vaultPda: vaultSolPda,
          lvsolMint: mint,
          redeemerLvsolAccount: redeemerAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
    });
  };

  const handleTrigger = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const programInstance = ensureProgram();
      if (!triggerOwner) {
        throw new Error("Provide the vault owner's public key.");
      }
      const owner = new PublicKey(triggerOwner.trim());
      const mint = new PublicKey((triggerMint || lvsolMintInput).trim());
      const { vaultSolPda, vaultStatePda } = deriveVaultAddresses(owner);
      const ownerAta = getAta(owner, mint);
      return programInstance.methods
        .triggerInheritance()
        .accounts({
          caller: walletKey!,
          vaultState: vaultStatePda,
          vaultPda: vaultSolPda,
          lvsolMint: mint,
          ownerLvsolAccount: ownerAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .rpc();
    });
  };

  return (
    <main>
      <header>
        <div>
          <h1>Vault Manager</h1>
          <p>Interact with the devnet deployment using your Phantom wallet.</p>
        </div>
        {walletKey ? (
          <div>
            <span style={{ marginRight: "0.75rem", fontWeight: 600 }}>
              {walletKey.toBase58().slice(0, 4)}……
              {walletKey.toBase58().slice(-4)}
            </span>
            <button className="secondary" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="primary" onClick={connectWallet}>
            Connect Phantom
          </button>
        )}
      </header>

      <section className="card">
        <h2 className="section-title">Initialize vault</h2>
        <form onSubmit={handleInitialize}>
          <label>
            lvSOL mint (Token-2022)
            <input
              type="text"
              value={lvsolMintInput}
              onChange={event => setLvsolMintInput(event.target.value)}
              placeholder="Enter the lvSOL mint address"
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Deposit (SOL)
              <input
                type="number"
                step="0.01"
                min="0"
                value={depositSol}
                onChange={event => setDepositSol(Number(event.target.value))}
                required
              />
            </label>
            <label>
              Reward (SOL)
              <input
                type="number"
                step="0.01"
                min="0"
                value={rewardSol}
                onChange={event => setRewardSol(Number(event.target.value))}
                required
              />
            </label>
            <label>
              Inactivity (seconds)
              <input
                type="number"
                min="1"
                value={inactivitySeconds}
                onChange={event =>
                  setInactivitySeconds(Number(event.target.value))
                }
                required
              />
            </label>
          </div>
          <label>
            Inheritors (one per line, address:percent)
            <textarea
              value={inheritorsText}
              placeholder={"Example:\nFsA...123:100"}
              onChange={event => setInheritorsText(event.target.value)}
            />
          </label>
          <button className="primary" type="submit" disabled={!walletKey}>
            Initialize Vault
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Add SOL</h2>
        <form onSubmit={handleAddSol}>
          <label>
            Amount (SOL)
            <input
              type="number"
              min="0"
              step="0.01"
              value={addAmountSol}
              onChange={event => setAddAmountSol(Number(event.target.value))}
              required
            />
          </label>
          <button className="primary" type="submit" disabled={!walletKey}>
            Deposit
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Ping</h2>
        <p>Refresh the vault's "last active" timestamp to keep it safe.</p>
        <button className="primary" onClick={handlePing} disabled={!walletKey}>
          Ping Vault
        </button>
      </section>

      <section className="card">
        <h2 className="section-title">Redeem lvSOL</h2>
        <form onSubmit={handleRedeem}>
          <label>
            Amount (SOL)
            <input
              type="number"
              min="0"
              step="0.01"
              value={redeemAmountSol}
              onChange={event => setRedeemAmountSol(Number(event.target.value))}
              required
            />
          </label>
          <button className="primary" type="submit" disabled={!walletKey}>
            Redeem
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">Trigger inheritance</h2>
        <form onSubmit={handleTrigger}>
          <label>
            Vault owner address
            <input
              type="text"
              value={triggerOwner}
              onChange={event => setTriggerOwner(event.target.value)}
              placeholder="Owner public key"
              required
            />
          </label>
          <label>
            Owner lvSOL mint
            <input
              type="text"
              value={triggerMint}
              onChange={event => setTriggerMint(event.target.value)}
              placeholder="Mint used by this vault"
              required
            />
          </label>
          <button className="primary" type="submit" disabled={!walletKey}>
            Trigger Distribution
          </button>
        </form>
      </section>

      {status && (
        <div className="status">
          <div>{status}</div>
          {txSignature && (
            <a
              className="tx-link"
              href={explorerUrl(txSignature)}
              target="_blank"
              rel="noreferrer"
            >
              View on Solana Explorer
            </a>
          )}
        </div>
      )}
    </main>
  );
}

export default App;
