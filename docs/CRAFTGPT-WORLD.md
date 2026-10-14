# CraftGPT-inspired world building (EdgeORE)

Reference: https://github.com/sammyuri/craftgpt (MIT; copyright © 2025 sammyuri).

The upstream CraftGPT project implements a small language model using Minecraft redstone mechanics. Its README warns that inference can take hours with MCHPRS and far longer in vanilla Minecraft, with at least 32GB of RAM recommended. Its context limit is 64 tokens. EdgeORE is a Three.js browser game: importing the original machine, weight binaries or emulation server would not work as a browser-ready assistant.

## Implemented: architecture-inspired voxel exhibits

The `src/game/compute-structures.ts` module defines four original deterministic blueprints:
- Embedding Array — token representation pillars
- Attention Hall — five parallel computation lanes
- Fixed-Point ALU — arithmetic signal lanes
- Context Memory — 64-slot representation

These are visual educational builds, not real inference circuits and not the upstream CraftGPT design copied into a browser. The API validates world bounds, occupied blocks, and protection zones around portals/terminals. No wallet or chain activity is involved.

## Future: five suitably sized assistants

A five-assistant runtime can be built later as separate, opt-in components: World Architect, Mining Guide, Crafting Helper, ORE Protocol Explainer (read-only), and Safety Auditor. Start with deterministic retrieval for commands; add inference only behind capability detection, explicit consent and benchmarked WebGPU/WASM limits. Never claim local task receipts are on-chain proof or real ORE earnings.

## Licensing

Upstream is MIT, with the original copyright notice in its repository. This adaptation uses independently authored visual concepts rather than copying the trained weights. Respect the upstream license if source code or weights are ever imported later.
