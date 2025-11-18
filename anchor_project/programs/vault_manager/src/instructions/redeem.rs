use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token_interface::{TokenAccount, Mint, TokenInterface, Burn, burn};
use crate::state::vault_state::VaultState;

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub redeemer: Signer<'info>,

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

    /// Redeemer’s lvSOL account (to burn from)
    #[account(
        mut,
        constraint = redeemer_lvsol_account.mint == lvsol_mint.key(),
        constraint = redeemer_lvsol_account.owner == redeemer.key()
    )]
    pub redeemer_lvsol_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Redeem>, redeem_amount: u64) -> Result<()> {
    let vault_state = &mut ctx.accounts.vault_state;

    // 🔥 Burn lvSOL from redeemer
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.lvsol_mint.to_account_info(),
            from: ctx.accounts.redeemer_lvsol_account.to_account_info(),
            authority: ctx.accounts.redeemer.to_account_info(),
        },
    );
    burn(burn_ctx, redeem_amount)?;

    // 💰 Transfer equivalent SOL from vault PDA → redeemer
    let ix = system_instruction::transfer(
        &ctx.accounts.vault_pda.key(),
        &ctx.accounts.redeemer.key(),
        redeem_amount,
    );
    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.vault_pda.to_account_info(),
            ctx.accounts.redeemer.to_account_info(),
        ],
        &[&[b"vault-sol", vault_state.owner.as_ref(), &[vault_state.vault_pda_bump]]],
    )?;

    // 🧮 Update vault state
    vault_state.locked_amount = vault_state.locked_amount.saturating_sub(redeem_amount);

    // 🧹 If vault SOL drained → close vault and distribute rent
    let remaining_lamports = ctx.accounts.vault_pda.lamports();
    let rent_exempt_minimum = Rent::get()?.minimum_balance(0);

    if remaining_lamports <= rent_exempt_minimum {
        // Split rent equally among inheritors
        let inheritors = &vault_state.inheritors;
        if !inheritors.is_empty() {
            let share_each = remaining_lamports / inheritors.len() as u64;

            for inheritor in inheritors {
                let ix = system_instruction::transfer(
                    &ctx.accounts.vault_pda.key(),
                    &inheritor.address,
                    share_each,
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
        }

        // Zero out remaining SOL if any
        **ctx.accounts.vault_pda.try_borrow_mut_lamports()? = 0;
    }

    emit!(Redeemed {
        redeemer: ctx.accounts.redeemer.key(),
        amount: redeem_amount,
    });

    Ok(())
}

#[event]
pub struct Redeemed {
    pub redeemer: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Failed to transfer lamports.")]
    LamportTransferFailed,
}
