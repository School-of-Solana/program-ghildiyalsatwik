# Project Description

**Deployed Frontend URL:** https://ghildiyalsatwik-program-ghildiyalsa.vercel.app/

**Solana Program ID:** CLA15YrbmHPb6tgtRkd9xtR9uuZPWkbb4E38fWpNwLbR

## Project Overview

### Description
On-chain “vault with inheritance” that time-locks a user’s SOL and mints a Token-2022 receipt token (lvSOL) representing the locked balance. The vault owner can top up or redeem by burning lvSOL, while watchers can trigger an inheritance distribution after the owner stays inactive for a configured duration. The trigger burns the owner’s lvSOL via delegate authority, pays a reward to the caller, and sends the remaining SOL from the vault PDA to predefined inheritors. A lightweight transfer-hook program guards the lvSOL mint so the vault program remains delegate and transfers flow only to system-owned accounts. A React + Anchor frontend on devnet mirrors the test flows (initialize, add SOL, ping, redeem, trigger).

### Key Features
- Initialize a vault: lock SOL, mint lvSOL receipts (Token-2022 + transfer hook), and register inheritors plus inactivity window.
- Add SOL to an existing vault; vault PDA holds lamports under program control.
- Keep-alive ping that refreshes last-active timestamp to prevent inheritance triggering.
- Redeem flow burns lvSOL to withdraw SOL partially or fully (distributes rent remainder to inheritors on drain).
- Inheritance trigger after inactivity: burns owner lvSOL via delegate PDA, pays caller reward, and distributes remaining SOL to inheritors.
- Frontend helper to auto-create a transfer-hook-enabled mint or use an existing lvSOL mint; shows tx links to Explorer.
  
### How to Use the dApp
1. **Connect Wallet** with Phantom on devnet in the frontend.
2. **Initialize Vault:** optionally auto-create a Token-2022 mint with transfer hook or paste an existing lvSOL mint; set deposit SOL, reward SOL, inactivity seconds, and inheritor list (`address:percent` per line, percent in whole numbers → basis points on-chain). Submit to lock SOL and mint lvSOL to your ATA.
3. **Add SOL:** specify extra SOL to deposit into your vault PDA.
4. **Ping:** refresh the vault’s `last_active_timestamp` to keep inheritance locked.
5. **Redeem:** enter SOL amount to burn lvSOL and withdraw from the vault PDA.
6. **Trigger Inheritance:** any caller supplies the vault owner address and lvSOL mint; after inactivity, caller receives the reward and inheritors receive their shares.

## Program Architecture
Two programs:
- `vault_manager` (Anchor) owns vault PDAs, mints/burns lvSOL receipts, and orchestrates deposits, redemptions, and inheritance.
- `lvsol_transfer_hook` (Token-2022 transfer hook) enforces transfers only to system-owned accounts and ensures `vault_manager` remains the delegate/owner for lvSOL accounts created during transfer.

Vault flow: `initialize` creates `vault_state` PDA for metadata and a `vault-sol` PDA to hold lamports/mint authority. Deposits move SOL to the PDA and mint lvSOL to the user; redemptions burn lvSOL and release SOL via signer seeds; triggering inheritance burns lvSOL via delegate PDA and streams lamports to inheritors plus a reward to the caller. Pings refresh activity timestamps to prevent premature triggering.

### PDA Usage
- `vault_state`: seeds `[b"vault", owner]` store metadata (owner, amounts, timings, inheritors, lvSOL mint, bump).
- `vault_pda` (aka `vault-sol`): seeds `[b"vault-sol", owner]` hold the vault’s lamports, act as mint authority/delegate for lvSOL, and sign SOL transfers during redeem/trigger.
- Token-2022 ATA derivations use `[owner, TOKEN_2022_PROGRAM_ID, mint]` on the front end/tests.

**PDAs Used:**
- `vault_state` PDA: metadata and bookkeeping for a single vault.
- `vault_sol` PDA: system-owned account that custody SOL and signs CPI burns/transfers for lvSOL-linked actions.

### Program Instructions
**Instructions Implemented:**
- `initialize(amount_sol, reward_lamports, inactivity_duration, inheritors)`: transfers SOL to `vault_sol` PDA, mints lvSOL receipts to the user ATA, approves PDA as delegate, and records metadata/inheritors.
- `add_sol(amount_lamports)`: moves additional lamports from the owner to the `vault_sol` PDA (emits `AddSolEvent`).
- `ping()`: owner-only keep-alive to update `last_active_timestamp` (emits `PingEvent`).
- `redeem(redeem_amount)`: burns the caller’s lvSOL and transfers matching lamports from the vault PDA; drains rent remainder evenly to inheritors when the vault is emptied (emits `Redeemed`).
- `trigger_inheritance()`: after inactivity, burns owner lvSOL via PDA delegate, pays `reward_lamports` to the caller, and distributes remaining lamports to inheritors (emits `InheritanceTriggered`).
- Transfer-hook `execute`: rejects transfers to non-system-owned accounts and reassigns account owner to the vault manager program to keep delegate authority intact.

### Account Structure
`vault_manager` main account:
```rust
#[account]
pub struct VaultState {
    pub owner: Pubkey,
    pub vault_pda_bump: u8,
    pub lvsol_mint: Pubkey,
    pub locked_amount: u64,
    pub reward_lamports: u64,
    pub last_active_timestamp: i64,
    pub inactivity_duration: i64,
    pub inheritors: Vec<InheritorShare>, // address + basis points (out of 10_000)
}
```

## Testing

### Test Coverage
Anchor TypeScript tests build Token-2022 mints with transfer hooks (matching frontend helper), derive PDAs, and run RPCs against local/test validator.

**Happy Path Tests:**
- `initialize` locks SOL, mints lvSOL, and persists state fields.
- `add_sol` increases vault PDA lamports balance.
- `ping` updates `last_active_timestamp`.
- `redeem` burns lvSOL, releases SOL to user, and updates locked amount.
- `trigger_inheritance` after inactivity pays caller reward and distributes remaining lamports to inheritors; vault locked_amount becomes zero.

**Unhappy Path Tests:**
- `add_sol` with wrong PDA seeds → `ConstraintSeeds` error.
- `ping` by non-owner → `UnauthorizedUser` error.
- `redeem` exceeding balance → transaction fails with insufficient funds.
- `trigger_inheritance` before inactivity window → `Vault is still active` error.

### Running Tests
```bash
# Commands to run your tests
anchor test
```

### Additional Notes for Evaluators

- Devnet IDs: `vault_manager` = CLA15YrbmHPb6tgtRkd9xtR9uuZPWkbb4E38fWpNwLbR, `lvsol_transfer_hook` = 2qT1ykhHkH7XFZVGBgnNVMGcmciZ2bbrwVfSqdrGjUNT.
- lvSOL receipt mint uses Token-2022 with a transfer hook; by default the frontend can auto-create it with `vault-sol` PDA as mint authority/delegate, or you can paste an existing mint (`DEFAULT_LVSOL_MINT` can be set in `frontend/src/config.ts`).
- Inheritor shares are in basis points (sum up to 10_000 for 100%); reward is paid before distribution.
