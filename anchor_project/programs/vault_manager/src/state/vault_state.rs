use anchor_lang::prelude::*;

#[account]
pub struct VaultState {
    pub owner: Pubkey,                  // Original vault creator
    pub vault_pda_bump: u8,             // PDA bump
    pub lvsol_mint: Pubkey,             // Mint address of lvSOL (Token-2022)
    pub locked_amount: u64,             // SOL locked in vault
    pub reward_lamports: u64,           // Reward for triggering inheritance
    pub last_active_timestamp: i64,     // Last time owner interacted
    pub inactivity_duration: i64,       // Duration after which inheritance triggers
    pub inheritors: Vec<InheritorShare>,// Distribution plan
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InheritorShare {
    pub address: Pubkey,
    pub amount: u64, // or percentage if you prefer proportional
}