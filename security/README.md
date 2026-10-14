# EdgeORE v4.2 security layer

This directory is separate from the voxel game and the ORE terminal. Nothing here is imported by `src/`. Real SOL deployment stays behind the existing fixture gate.

## What is here

| Piece | Path | Status |
| --- | --- | --- |
| Tamarin model of approval, gate, and receipts | `tamarin/edgeore-approval.spthy` | Machine-checked with Tamarin 1.12.0 and Maude 3.5.1. All six lemmas verified. See `tamarin/PROOF.txt`. |
| Prover runner | `tamarin/run.sh` | Runs `tamarin-prover --prove` when both binaries are on `PATH`. |
| Review and receipt policy | `protocol/approval.mjs` | Tested. Refuses a mutated message. Verified only if every check passes. |
| Privacy Cash policy adapter | `privacy/adapter.mjs` | Tested. Refuses ORE deploy, hardware wallets, and missing consent. Submits nothing. |
| ML-DSA-44 receipt benchmark | `pq/receipt.mjs` | Tested with `@noble/post-quantum`. Does not replace Solana signatures. |

## Run

```sh
node --test 'security/**/*.test.mjs'
node security/pq/bench.mjs
bash security/tamarin/run.sh
```

Install [Tamarin 1.12.0](https://github.com/tamarin-prover/tamarin-prover/releases/download/1.12.0/tamarin-prover-1.12.0-linux64-ubuntu.tar.gz) and [Maude 3.5.1](https://github.com/maude-lang/Maude/releases/download/Maude3.5.1/Maude-3.5.1-linux-x86_64.zip), put both binaries on `PATH`, then:

```sh
bash security/tamarin/run.sh
```

The recorded result is in [tamarin/PROOF.txt](tamarin/PROOF.txt). A missing prover prints `NOT RUN` and is not a passed proof.

## Explicit non-goals

- `rustpq/pqcrypto` is archived. It is not a dependency.
- `dhl/solana-web3.js` is not a dependency.
- Privacy Cash is not on the ORE deploy path.
- A post-quantum receipt signature does not make a Solana transaction post-quantum.
- A Tamarin lemma is not proved until `tamarin-prover --prove` prints that it is.
