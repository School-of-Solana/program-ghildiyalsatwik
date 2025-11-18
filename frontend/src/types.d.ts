import type { PublicKey, Transaction } from "@solana/web3.js";

interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

export {};
