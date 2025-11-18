# Vault Manager Frontend

A lightweight React + Vite dashboard for interacting with the `vault_manager` program on Solana devnet. It relies on a Phantom-compatible browser wallet and the Anchor IDL baked into the app.

## Features

- Connect/disconnect Phantom.
- Initialize a vault (deposit SOL, configure reward, inactivity window, inheritors, and lvSOL mint).
- Add more SOL to an existing vault and refresh its activity timestamp.
- Redeem lvSOL back into SOL.
- Trigger the inheritance flow (for watchers/caretakers).

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL in a browser with the Phantom extension. Switch Phantom to devnet.

### Customising the lvSOL mint

By default the UI leaves the lvSOL mint empty. Enter the devnet mint address you control (one that assigned the vault PDA as delegate) in the "Initialize" form. You can also set `DEFAULT_LVSOL_MINT` inside `src/config.ts` if you want it prefilled for every session.

### Deploying for production

```bash
npm run build
npm run preview # optional local preview of the production build
```

The generated static assets will live inside `frontend/dist`. You can host them on any static site provider.
