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
      "name": "init",
      "discriminator": [
        220,
        59,
        207,
        236,
        108,
        250,
        47,
        100
      ],
      "accounts": [],
      "args": []
    }
  ]
};
