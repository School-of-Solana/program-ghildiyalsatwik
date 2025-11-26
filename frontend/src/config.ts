import { PublicKey } from "@solana/web3.js";

// Allow overriding via Vercel/Vite env vars, fall back to current devnet values
const rpcEndpoint = import.meta.env.VITE_RPC_ENDPOINT ?? "https://api.devnet.solana.com";
const programIdString =
  import.meta.env.VITE_PROGRAM_ID ?? "CLA15YrbmHPb6tgtRkd9xtR9uuZPWkbb4E38fWpNwLbR";
const transferHookProgramIdString =
  import.meta.env.VITE_TRANSFER_HOOK_PROGRAM_ID ?? "2qT1ykhHkH7XFZVGBgnNVMGcmciZ2bbrwVfSqdrGjUNT";
const defaultLvsolMint = import.meta.env.VITE_DEFAULT_LVSOL_MINT ?? "";

export const RPC_ENDPOINT = rpcEndpoint;
export const PROGRAM_ID = new PublicKey(programIdString);
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);
// Token-2022 transfer hook program used by the tests and front-end mint helper
export const TRANSFER_HOOK_PROGRAM_ID = new PublicKey(transferHookProgramIdString);
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// Replace with the lvSOL mint you deploy on devnet or override in the UI.
export const DEFAULT_LVSOL_MINT = defaultLvsolMint;
