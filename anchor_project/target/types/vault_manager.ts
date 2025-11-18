/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vault_manager.json`.
 */
export type VaultManager = {
  "address": "C6KnmAotGiA1B9ii2mWz4PB1iujSjXcZfB5z78mgg11b",
  "metadata": {
    "name": "vaultManager",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "addSol",
      "discriminator": [
        167,
        74,
        202,
        148,
        240,
        121,
        198,
        1
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "Vault authority (payer of SOL)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultPda",
          "docs": [
            "Seeds tie this PDA to the vault owner and owner constraint ensures it’s the system program,",
            "so treating it as unchecked is safe."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  115,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "vaultPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  115,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "lvsolMint",
          "docs": [
            "Mint for lvSOL (Token-2022)"
          ],
          "writable": true
        },
        {
          "name": "userLvsolAta",
          "docs": [
            "User's lvSOL ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "lvsolMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "amountSol",
          "type": "u64"
        },
        {
          "name": "rewardLamports",
          "type": "u64"
        },
        {
          "name": "inactivityDuration",
          "type": "i64"
        },
        {
          "name": "inheritors",
          "type": {
            "vec": {
              "defined": {
                "name": "inheritorShare"
              }
            }
          }
        }
      ]
    },
    {
      "name": "ping",
      "discriminator": [
        173,
        0,
        94,
        236,
        73,
        133,
        225,
        153
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vaultState"
          ]
        },
        {
          "name": "vaultState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "redeem",
      "discriminator": [
        184,
        12,
        86,
        149,
        70,
        196,
        97,
        225
      ],
      "accounts": [
        {
          "name": "redeemer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault_state.owner",
                "account": "vaultState"
              }
            ]
          }
        },
        {
          "name": "vaultPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  115,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "vault_state.owner",
                "account": "vaultState"
              }
            ]
          }
        },
        {
          "name": "lvsolMint",
          "writable": true
        },
        {
          "name": "redeemerLvsolAccount",
          "docs": [
            "Redeemer’s lvSOL account (to burn from)"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "redeemAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "triggerInheritance",
      "discriminator": [
        102,
        13,
        227,
        85,
        64,
        58,
        12,
        49
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault_state.owner",
                "account": "vaultState"
              }
            ]
          }
        },
        {
          "name": "vaultPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  115,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "vault_state.owner",
                "account": "vaultState"
              }
            ]
          }
        },
        {
          "name": "lvsolMint",
          "writable": true
        },
        {
          "name": "vaultLvsolAccount",
          "docs": [
            "Token account of the vault PDA (to burn from)"
          ],
          "writable": true
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
  "accounts": [
    {
      "name": "vaultState",
      "discriminator": [
        228,
        196,
        82,
        165,
        98,
        210,
        235,
        152
      ]
    }
  ],
  "events": [
    {
      "name": "addSolEvent",
      "discriminator": [
        95,
        248,
        93,
        158,
        29,
        213,
        33,
        73
      ]
    },
    {
      "name": "inheritanceTriggered",
      "discriminator": [
        236,
        16,
        253,
        180,
        0,
        41,
        187,
        191
      ]
    },
    {
      "name": "pingEvent",
      "discriminator": [
        201,
        63,
        3,
        86,
        87,
        80,
        149,
        174
      ]
    },
    {
      "name": "redeemed",
      "discriminator": [
        14,
        29,
        183,
        71,
        31,
        165,
        107,
        38
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "vaultStillActive",
      "msg": "Vault is still active; cannot trigger inheritance."
    },
    {
      "code": 6001,
      "name": "unauthorizedUser",
      "msg": "Unauthorized user."
    },
    {
      "code": 6002,
      "name": "lamportTransferFailed",
      "msg": "Lamport transfer failed."
    }
  ],
  "types": [
    {
      "name": "addSolEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "inheritanceTriggered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "triggeredBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "inheritorShare",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pingEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "redeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "redeemer",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "vaultState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "vaultPdaBump",
            "type": "u8"
          },
          {
            "name": "lvsolMint",
            "type": "pubkey"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "rewardLamports",
            "type": "u64"
          },
          {
            "name": "lastActiveTimestamp",
            "type": "i64"
          },
          {
            "name": "inactivityDuration",
            "type": "i64"
          },
          {
            "name": "inheritors",
            "type": {
              "vec": {
                "defined": {
                  "name": "inheritorShare"
                }
              }
            }
          }
        ]
      }
    }
  ]
};
