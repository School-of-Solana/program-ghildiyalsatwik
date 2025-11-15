use anchor_lang::prelude::*;
use crate::state::vault_state::VaultState;

#[derive(Accounts)]
pub struct Ping<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ ErrorCode::UnauthorizedUser,
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
}

pub fn handler(ctx: Context<Ping>) -> Result<()> {
    let vault_state = &mut ctx.accounts.vault_state;

    vault_state.last_active_timestamp = Clock::get()?.unix_timestamp;

    emit!(PingEvent {
        owner: ctx.accounts.owner.key(),
        timestamp: vault_state.last_active_timestamp,
    });

    Ok(())
}

#[event]
pub struct PingEvent {
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not the owner of this vault.")]
    UnauthorizedUser,
}
