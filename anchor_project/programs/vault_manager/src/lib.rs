use anchor_lang::prelude::*;

declare_id!("C6KnmAotGiA1B9ii2mWz4PB1iujSjXcZfB5z78mgg11b"); // replace with your real address

#[program]
pub mod vault_manager {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}