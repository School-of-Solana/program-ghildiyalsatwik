use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

/// User adds more SOL into an already initialized vault.
#[derive(Accounts)]
pub struct AddSol<'info> {
    /// Vault authority (payer of SOL)
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK:
    /// Seeds tie this PDA to the vault owner and owner constraint ensures it’s the system program,
    /// so treating it as unchecked is safe.
    #[account(
        mut,
        seeds = [b"vault-sol", user.key().as_ref()],
        bump,
        owner = system_program.key(),
    )]
    pub vault_pda: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddSol>, amount_lamports: u64) -> Result<()> {
    let user = &ctx.accounts.user;
    let vault_pda = &ctx.accounts.vault_pda;
    let system_program = &ctx.accounts.system_program;

    let ix = system_instruction::transfer(
        &user.key(),
        &vault_pda.key(),
        amount_lamports,
    );

    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            user.to_account_info(),
            vault_pda.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    emit!(AddSolEvent {
        vault: vault_pda.key(),
        from: user.key(),
        amount: amount_lamports,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct AddSolEvent {
    pub vault: Pubkey,
    pub from: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
