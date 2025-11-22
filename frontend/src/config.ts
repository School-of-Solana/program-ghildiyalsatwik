import { PublicKey } from "@solana/web3.js";

export const RPC_ENDPOINT = "https://api.devnet.solana.com";
export const PROGRAM_ID = new PublicKey("C6KnmAotGiA1B9ii2mWz4PB1iujSjXcZfB5z78mgg11b");
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);
// Token-2022 transfer hook program used by the tests and front-end mint helper
export const TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  "tDGxsLSWHUQ678asjwp1UTdtPq5VFw9NNFDskxcsBdR"
);
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// Replace with the lvSOL mint you deploy on devnet or override in the UI.
export const DEFAULT_LVSOL_MINT = "";
