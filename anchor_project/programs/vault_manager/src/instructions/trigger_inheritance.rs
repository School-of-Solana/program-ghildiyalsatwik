use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token_interface::{
    TokenAccount, Mint, TokenInterface, Burn, burn
};
use crate::state::vault_state::VaultState;
use anchor_lang::solana_program::{system_instruction, program_option::COption};

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

    /// Owner's lvSOL account (delegated to the vault PDA)
    #[account(
        mut,
        constraint = owner_lvsol_account.mint == lvsol_mint.key(),
        constraint = owner_lvsol_account.owner == vault_state.owner
    )]
    pub owner_lvsol_account: InterfaceAccount<'info, TokenAccount>,

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

    // Ensure delegate is configured
    require!(
        ctx.accounts.owner_lvsol_account.delegate == COption::Some(ctx.accounts.vault_pda.key()),
        ErrorCode::MissingDelegate
    );

    // 2️⃣ Burn the lvSOL tokens (from owner's account via delegate)
    let vault_bump = &[vault_state.vault_pda_bump];
    let signer_seeds: &[&[u8]] = &[
        b"vault-sol",
        vault_state.owner.as_ref(),
        vault_bump,
    ];
    let signer = &[signer_seeds];
    let burn_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.lvsol_mint.to_account_info(),
            from: ctx.accounts.owner_lvsol_account.to_account_info(),
            authority: ctx.accounts.vault_pda.to_account_info(),
        },
        signer,
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

    // Update vault bookkeeping
    vault_state.locked_amount = 0;

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
    #[msg("Vault PDA must be approved as delegate over owner's lvSOL.")]
    MissingDelegate,
}
