#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token_interface::{set_authority, Mint, SetAuthority, TokenAccount, TokenInterface};
use anchor_spl::token_interface::spl_token_2022::instruction::AuthorityType;


declare_id!("tDGxsLSWHUQ678asjwp1UTdtPq5VFw9NNFDskxcsBdR"); // replace with your real program ID

#[program]
pub mod lvsol_transfer_hook {
    use super::*;

    // Called automatically by the Token-2022 program before a transfer.
    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let to_account_info = ctx.accounts.to.to_account_info();
        let to_owner = to_account_info.owner;

        // ✅ 1. Restrict: only allow destination accounts owned by the system program
        if *to_owner != system_program::ID {
            return err!(TransferError::InvalidDestination);
        }

        // ✅ 2. Enforce: vault_manager program must be the delegate
        // ✅ 2. Enforce: vault_manager program must be delegate of the `from` token account
        let vault_manager_program = ctx.accounts.vault_manager_program.key();
        let from_account = &ctx.accounts.from;

        if from_account.delegate.is_none() || from_account.delegate.unwrap() != vault_manager_program {
            return err!(TransferError::InvalidDelegate);
        }

        let set_delegate_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: ctx.accounts.vault_manager_program.to_account_info(),
                account_or_mint: ctx.accounts.to.to_account_info(),
            },
        );

        set_authority(
            set_delegate_ctx,
            AuthorityType::AccountOwner,
            Some(vault_manager_program),
        )?;


        Ok(())
    }

}


#[derive(Accounts)]
pub struct Execute<'info> {
    #[account()]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub from: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub to: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: validated by program logic
    pub vault_manager_program: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum TransferError {
    #[msg("Transfers to non-system accounts are not allowed.")]
    InvalidDestination,
    #[msg("Vault manager is not the delegate for this mint.")]
    InvalidDelegate,
}
