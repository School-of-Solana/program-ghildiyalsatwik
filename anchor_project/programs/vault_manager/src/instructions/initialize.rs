use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{TokenAccount, TokenInterface, Mint, MintToChecked, mint_to_checked},
};
use anchor_spl::token_interface::spl_token_2022::id as token_2022_id;
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

    /// CHECK:
    /// Seeds constrain this PDA and we enforce the owner to be the system program,
    /// so it is safe to treat it as an unchecked account that just holds SOL.
    #[account(
        init,
        payer = user,
        seeds = [b"vault-sol", user.key().as_ref()],
        bump,
        space = 0,
        owner = system_program.key(),
    )]
    pub vault_pda: AccountInfo<'info>,

    /// The mint account for lvSOL (Token-2022)
    #[account(
        mut,
        constraint = lvsol_mint.to_account_info().owner == &token_2022_id()
    )]
    pub lvsol_mint: InterfaceAccount<'info, Mint>,

    /// User's ATA for lvSOL
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
    let vault_state = &mut ctx.accounts.vault_state;
    let vault_pda = &ctx.accounts.vault_pda;

    // Transfer SOL from user → vault PDA
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

    // Mint lvSOL to user equivalent to locked SOL
    let user_key = user.key();
    let pda_bump = ctx.bumps.vault_pda;
    let seeds = &[b"vault-sol", user_key.as_ref(), &[pda_bump]];
    let signer = &[&seeds[..]];

    mint_to_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintToChecked {
                mint: ctx.accounts.lvsol_mint.to_account_info(),
                to: ctx.accounts.user_lvsol_ata.to_account_info(),
                authority: vault_pda.to_account_info(),
            },
            signer,
        ),
        amount_sol,
        9, // decimals
    )?;

    // Store vault metadata
    vault_state.owner = user.key();
    vault_state.locked_amount = amount_sol;
    vault_state.reward_lamports = reward_lamports;
    vault_state.last_active_timestamp = Clock::get()?.unix_timestamp;
    vault_state.inactivity_duration = inactivity_duration;
    vault_state.inheritors = inheritors;
    vault_state.lvsol_mint = ctx.accounts.lvsol_mint.key();
    vault_state.vault_pda_bump = pda_bump;

    Ok(())
}
