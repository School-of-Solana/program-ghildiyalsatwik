use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        spl_token_2022::id as token_2022_id,
        mint_to,
        approve,
        Approve,
        Mint,
        MintTo,
        TokenAccount,
        TokenInterface,
    },
};
use crate::state::vault_state::{InheritorShare, VaultState};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<VaultState>(),
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,

    /// CHECK: PDA holds SOL, no serialization
    #[account(
        init,
        payer = user,
        seeds = [b"vault-sol", user.key().as_ref()],
        bump,
        space = 0,
        owner = system_program.key(),
    )]
    pub vault_pda: AccountInfo<'info>,

    /// Mint for lvSOL (Token-2022)
    #[account(
        mut,
        constraint = lvsol_mint.to_account_info().owner == &token_2022_id()
    )]
    pub lvsol_mint: InterfaceAccount<'info, Mint>,

    /// User's lvSOL ATA
    #[account(
        init,
        payer = user,
        associated_token::mint = lvsol_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_lvsol_ata: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<Initialize>,
    amount_sol: u64,
    reward_lamports: u64,
    inactivity_duration: i64,
    inheritors: Vec<InheritorShare>,
) -> Result<()> {
    let user = &ctx.accounts.user;
    let vault_pda = &ctx.accounts.vault_pda;

    // ✅ 1. Transfer SOL from user → vault PDA
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: user.to_account_info(),
                to: vault_pda.to_account_info(),
            },
        ),
        amount_sol,
    )?;

    // ✅ 2. Mint lvSOL to user equivalent to locked SOL
    mint_lvsol_to_user(&ctx, amount_sol)?;

    // ✅ 3. Store vault metadata
    let vault_state = &mut ctx.accounts.vault_state;
    vault_state.owner = user.key();
    vault_state.locked_amount = amount_sol;
    vault_state.reward_lamports = reward_lamports;
    vault_state.last_active_timestamp = Clock::get()?.unix_timestamp;
    vault_state.inactivity_duration = inactivity_duration;
    vault_state.inheritors = inheritors;
    vault_state.lvsol_mint = ctx.accounts.lvsol_mint.key();
    vault_state.vault_pda_bump = ctx.bumps.vault_pda;

    Ok(())
}

/// Helper: Mint lvSOL and set vault_manager as delegate
pub fn mint_lvsol_to_user(ctx: &Context<Initialize>, amount: u64) -> Result<()> {
    // --- 1️⃣ Mint tokens to user's lvSOL ATA ---
    let user_key = ctx.accounts.user.key();
    let seeds = &[
        b"vault-sol",
        user_key.as_ref(),
        &[ctx.bumps.vault_pda],
    ];
    let signer = &[&seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.lvsol_mint.to_account_info(),
            to: ctx.accounts.user_lvsol_ata.to_account_info(),
            authority: ctx.accounts.vault_pda.to_account_info(),
        },
        signer,
    );

    mint_to(mint_ctx, amount)?;

    // --- 2️⃣ Approve vault PDA as delegate to burn on inactivity ---
    let approve_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Approve {
            to: ctx.accounts.user_lvsol_ata.to_account_info(),
            delegate: ctx.accounts.vault_pda.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );

    approve(approve_ctx, amount)?;

    Ok(())
}
