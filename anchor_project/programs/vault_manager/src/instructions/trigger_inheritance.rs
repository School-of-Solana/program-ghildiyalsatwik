use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface, Burn, burn
};
use crate::state::vault_state::{VaultState, InheritorShare};
use anchor_lang::solana_program::{self, system_instruction};

#[derive(Accounts)]
pub struct TriggerInheritance<'info> {
    #[account(mut)]
    pub caller: Signer<'info>, // the one who triggers and gets reward

    #[account(
        mut,
        seeds = [b"vault", vault_state.owner.as_ref()],
        bump = vault_state.vault_pda_bump
    )]
    pub vault_state: Account<'info, VaultState>,
    

    /// CHECK: PDA that holds SOL for this vault
    #[account(
        mut,
        seeds = [b"vault-sol", vault_state.owner.as_ref()],
        bump,
        owner = system_program::ID
    )]
    pub vault_pda: AccountInfo<'info>,

    #[account(
        mut,
        constraint = lvsol_mint.key() == vault_state.lvsol_mint
    )]
    pub lvsol_mint: InterfaceAccount<'info, Mint>,

    /// Token account of the vault PDA (to burn from)
    #[account(
        mut,
        constraint = vault_lvsol_account.mint == lvsol_mint.key()
    )]
    pub vault_lvsol_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TriggerInheritance>) -> Result<()> {
    let vault_state = &mut ctx.accounts.vault_state;

    let current_time = Clock::get()?.unix_timestamp;
    let expiry_time = vault_state.last_active_timestamp + vault_state.inactivity_duration;

    // 1️⃣ Check inactivity period
    require!(
        current_time >= expiry_time,
        ErrorCode::VaultStillActive
    );

    // 2️⃣ Burn the lvSOL tokens (from vault PDA)
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.lvsol_mint.to_account_info(),
            from: ctx.accounts.vault_lvsol_account.to_account_info(),
            authority: ctx.accounts.vault_pda.to_account_info(),
        },
    );

    burn(burn_ctx, vault_state.locked_amount)?;

    // 3️⃣ Calculate and transfer SOL to inheritors
    let total_lamports = ctx.accounts.vault_pda.lamports();
    let reward = vault_state.reward_lamports;
    let available_for_inheritors = total_lamports.saturating_sub(reward);

    // Transfer reward to caller
    **ctx.accounts.vault_pda.try_borrow_mut_lamports()? -= reward;
    **ctx.accounts.caller.try_borrow_mut_lamports()? += reward;

    // Distribute remaining lamports to inheritors
    for inheritor in &vault_state.inheritors {
        let share_amount =
            (available_for_inheritors * inheritor.amount as u64) / 10_000;
    
        let ix = system_instruction::transfer(
            &ctx.accounts.vault_pda.key(),
            &inheritor.address,
            share_amount,
        );
    
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_pda.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"vault-sol", vault_state.owner.as_ref(), &[vault_state.vault_pda_bump]]],
        )?;
    }

    // 4️⃣ Emit event
    emit!(InheritanceTriggered {
        owner: vault_state.owner,
        triggered_by: ctx.accounts.caller.key(),
        timestamp: current_time,
    });

    Ok(())
}

#[event]
pub struct InheritanceTriggered {
    pub owner: Pubkey,
    pub triggered_by: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Vault is still active; cannot trigger inheritance.")]
    VaultStillActive,
    #[msg("Unauthorized user.")]
    UnauthorizedUser,
    #[msg("Lamport transfer failed.")]
    LamportTransferFailed,
}