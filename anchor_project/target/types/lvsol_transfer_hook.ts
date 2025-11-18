/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lvsol_transfer_hook.json`.
 */
export type LvsolTransferHook = {
  "address": "tDGxsLSWHUQ678asjwp1UTdtPq5VFw9NNFDskxcsBdR",
  "metadata": {
    "name": "lvsolTransferHook",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "execute",
      "discriminator": [
        130,
        221,
        242,
        154,
        13,
        193,
        189,
        29
      ],
      "accounts": [
        {
          "name": "mint"
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "vaultManagerProgram"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidDestination",
      "msg": "Transfers to non-system accounts are not allowed."
    },
    {
      "code": 6001,
      "name": "invalidDelegate",
      "msg": "Vault manager is not the delegate for this mint."
    }
  ]
};
