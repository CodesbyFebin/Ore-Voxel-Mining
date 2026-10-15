# EdgeORE: implementation and release audit (2026-10-15)

Baseline: `706615494d2bd266b0cb18c5d79127b9da1dc705`. Integration branch: `feat/shaft-channel-safety`.

## Implemented and preserved

- Canonical `src/game/blocks.ts` block registry (Timber id 13, Bedrock id 17).
- Three **separate**, locally bounded (24-high) dimensions, seeded portal layout and shared deterministic shaft X/Z.
- Key-based hold-P descent, now with movement cancellation and a 2 s post-transition cooldown on the branch.
- Existing greedy X/Z meshes, edit-map writes and neighbor invalidation.
- LocalStorage-authoritative saves; IndexedDB chunk snapshots remain a secondary backup.
- Read-only fail-closed ORE board decoding; financial operation builders remain disabled.
- Four deterministic CraftGPT-inspired decorative compute structure blueprints, existing clearance checks.
- CraftGPT Studio selector, command parser, top-down 11×11 preview, block/material estimate and confirmation UI on the integration branch.

## Not implemented / not represented as working

1. Real language-model inference in CraftGPT Studio, a Gemini endpoint, or five autonomous AI assistants. The current UI is deterministic only.
2. A single contiguous signed-Y world across -64..127; the game retains three distinct dimensions with Y=0..23.
3. Revisioned authoritative IndexedDB restoration, crash-safe localStorage/IndexedDB transactions, async chunk streaming and 18³ seam apron wired into the renderer. Snapshot storage is secondary and current greedy meshing must not be removed.
4. Verified 50-round historical hot/cold analytics and actual financial transaction preflight simulation; the ORE UI must not fabricate samples.
5. Comprehensive real-browser Playwright checks for WebGL, touch ID interruption, cross-dimension persistence, crash/reload and local testing hooks. A Vite build is not evidence that these pass.
6. Benchmarked FPS/triangle reduction, wallet-connection funnel metrics, or bot prevention claims.
7. GitHub Pages publishing. **Vercel is the only desired deployment target**; Pages workflow was removed from this branch.

## Release safety gates

- Require the branch CI workflow `EdgeORE branch release gates` to pass `npm ci`, `npm run typecheck`, deterministic game tests, `npm test` and `npm run build`.
- Require browser smoke testing for `/game`, working WebGL/canvas and touch input before promoting Vercel preview to production.
- Do not merge failures away by loosening assertions without comparing them to their intended feature contract.
- No protocol changes, keys, signing, fabricated chain state or wallet dependency for local building.
- Until gates are complete keep PR in draft and do not promote the Vercel preview to production.
