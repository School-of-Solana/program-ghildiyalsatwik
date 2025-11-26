/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_ENDPOINT?: string;
  readonly VITE_PROGRAM_ID?: string;
  readonly VITE_TRANSFER_HOOK_PROGRAM_ID?: string;
  readonly VITE_DEFAULT_LVSOL_MINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
