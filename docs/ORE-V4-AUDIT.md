# ORE V4 protocol integration audit (2026-10-15)

## Source of truth

Upstream: https://github.com/regolith-labs/ore (master, inspected 2026-10-15).
Relevant upstream files:
- `api/src/consts.rs`: addresses, mint, 11 decimal ORE token precision.
- `program/src/deploy.rs`: Deploy account ordering, round-window checks, automation branches.
- `api/src/instruction.rs`: instruction definitions.
- `program/src/claim_ore.rs`, `claim_sol.rs`, `checkpoint.rs`: claims/checkpoints.

**Do not use protocol addresses from community notes without validating them against the deployed upstream and on-chain account ownership.** The supplied prose notes named `mineRHF5r6S7HyD9SppBfVMXMavDkJsxwGesEvxZr2A` and `oreoN2tQbHXVaZsr3pf66A48miqcBXCDJozganhEJgz`; these conflict with the currently inspected upstream `api/src/consts.rs` mint (which remains `oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp`) and the current app's program integration. V4 rules do not imply a new Program ID.

## Present implementation

- Three.js voxel game, three dimensions, purple/orange portals, separate sandbox gameplay economy.
- Read-only RPC board + 25 tile data and wallet account balances.
- Snapshot now requires expected on-chain owner for the board and selected round, and matching round IDs; otherwise it fails closed.
- Slot countdown is **an estimate** and can be stale; do not interpret the UI as an exchange-grade clock.
- Read-only terminal and demo trading/staking must stay distinctly labeled.
- `src/ore/tx.ts` exported action builders throw unconditionally; no real Deploy/Claim/Checkpoint is permitted.

## Remaining release gates

1. Pin exact upstream program commit and independently verify deployment ID, program data, live board/treasury/round ownership and sizes.
2. Pin the deployed instruction discriminators, data layout and ordered metas using independently verified transactions; test both ordinary and automation paths.
3. Verify account layouts against known on-chain examples; test changes in round IDs across RPC reads, especially near boundary.
4. Check current slot at consistent commitment; warn near round end and prevent executing against expired rounds. Do not promise an automatic SOL refund until verified from program behavior.
5. Run transaction simulation, instruction/message binding checks and explicit wallet signing only in a separate opt-in integration after safety review.
6. Verify receipts using signed transaction bytes, slot, blockhash, execution status and before/after authoritative state. Account state at verification time alone does not prove a historical change.
7. If no equivalent ORE program deployment is available on devnet, use a local validator with the required protocol deployment and fixtures; a generic devnet address is not a valid substitute.
8. Obtain independent security review before enabling mainnet financial functions.

## Important product copy

Breaking voxel blocks earns **only virtual game resources**, not ORE cryptocurrency. Visual demonstrations of trading and staking **do not transact on Solana**, yield rewards or imply protocol endorsement. All real spending, claiming and signing remains disabled.


## Audit-spec compatibility notes (2026-10-15)

The contributed specification is a release-gate checklist, **not verified instruction/account data**. Its illustrative Anchor snippets and six-account Deploy layout must **not** be implemented verbatim. The inspected ORE source uses Steel APIs and a Deploy flow that splits 10 ORE accounts from entropy accounts; the current board and round data must be validated against their actual upstream structs, not assumed to be an Anchor 8-byte SHA-256 discriminator or a board-embedded 25-tile array.

Source attestation remains **INCOMPLETE**: no pinned 40-character upstream source SHA, deployed program binary verification, deterministic build hash, historical transaction fixture, or release audit has been established by this document. The provided native pseudo-code contained a placeholder `mineRHF...` program ID, which is not an approved runtime identifier. The Rust background-worker example also constructs Godot PackedArrays off the main thread; an implementation should return plain Rust-owned vertex/index buffers to the main thread instead and instantiate Godot engine objects there.

The bridge stays in READ-ONLY / FAIL-CLOSED mode. No wallet keys, session signers or state-changing Solana instructions are supplied by this work.
