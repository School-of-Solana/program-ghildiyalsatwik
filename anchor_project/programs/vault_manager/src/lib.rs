#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

pub use instructions::{AddSol, Initialize, Ping, TriggerInheritance};
pub use state::vault_state::InheritorShare;

pub(crate) mod __client_accounts_initialize {
    pub use crate::instructions::initialize::__client_accounts_initialize::*;
}
pub(crate) mod __client_accounts_add_sol {
    pub use crate::instructions::add_sol::__client_accounts_add_sol::*;
}
pub(crate) mod __client_accounts_ping {
    pub use crate::instructions::ping::__client_accounts_ping::*;
}
pub(crate) mod __client_accounts_trigger_inheritance {
    pub use crate::instructions::trigger_inheritance::__client_accounts_trigger_inheritance::*;
}

declare_id!("C6KnmAotGiA1B9ii2mWz4PB1iujSjXcZfB5z78mgg11b");

#[program]
pub mod vault_manager {
    use super::instructions::{add_sol, initialize, ping, trigger_inheritance};
    use super::{AddSol, Initialize, Ping, TriggerInheritance, InheritorShare};
    use anchor_lang::prelude::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        amount_sol: u64,
        reward_lamports: u64,
        inactivity_duration: i64,
        inheritors: Vec<InheritorShare>,
    ) -> Result<()> {
        initialize::handler(ctx, amount_sol, reward_lamports, inactivity_duration, inheritors)
    }

    pub fn add_sol(ctx: Context<AddSol>, amount_lamports: u64) -> Result<()> {
        add_sol::handler(ctx, amount_lamports)
    }

    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        ping::handler(ctx)
    }

    pub fn trigger_inheritance(ctx: Context<TriggerInheritance>) -> Result<()> {
        trigger_inheritance::handler(ctx)
    }
}
