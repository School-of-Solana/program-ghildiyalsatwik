use anchor_lang::prelude::*;

#[account]
pub struct VaultState {
    pub owner: Pubkey,                  // Original vault creator
    pub vault_pda_bump: u8,             // PDA bump
    pub vault_state_bump: u8,           // Vault state account bump
    pub lvsol_mint: Pubkey,             // Mint address of lvSOL (Token-2022)
    pub locked_amount: u64,             // SOL locked in vault
    pub reward_lamports: u64,           // Reward for triggering inheritance
    pub last_active_timestamp: i64,     // Last time owner interacted
    pub inactivity_duration: i64,       // Duration after which inheritance triggers
    pub inheritors: Vec<InheritorShare>,// Distribution plan
}

impl VaultState {
    // Fixed fields + vec length prefix (4 bytes)
    pub const BASE_SIZE: usize = 32 + 1 + 1 + 32 + 8 + 8 + 8 + 8 + 4;
    pub const INHERITOR_SIZE: usize = 32 + 8;
    pub const MAX_INHERITORS: usize = 20;

    pub const fn space_for_inheritors(count: usize) -> usize {
        Self::BASE_SIZE + (count * Self::INHERITOR_SIZE)
    }
}

// PDA seeds (versioned to avoid collisions with old layouts)
pub const VAULT_STATE_SEED: &[u8] = b"vault-v2";
pub const VAULT_SOL_SEED: &[u8] = b"vault-sol-v2";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InheritorShare {
    pub address: Pubkey,
    pub amount: u64, // or percentage if you prefer proportional
}
