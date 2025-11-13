use anchor_lang::prelude::*;

// This program will implement the Token-2022 TransferHook "execute" entry.
// We'll wire it up later; for now just a stub so it builds.
declare_id!("tDGxsLSWHUQ678asjwp1UTdtPq5VFw9NNFDskxcsBdR"); // replace with your real address

#[program]
pub mod lvsol_transfer_hook {
    use super::*;
    pub fn init(_ctx: Context<Init>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Init {}