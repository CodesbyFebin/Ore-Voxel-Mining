# OreBunker v6 — original integration workstream

This module contains original, engine-independent cave/ore generation and server-oriented arena rules.

- 48×48 deterministic underground voxel layer.
- Coal, diamond, orange ORE-emblem ore, and cyan/purple Solana-emblem ore.
- Distance-, hardness- and boundary-validated excavation.
- 60-second tournament with 25-player lobby, ready-up, duplicate rejection and verification state.
- JSON versioned save serializer; fictional credits only.
- Run tests with `node --test orebunker/v6/world.test.mjs` from the repository root.

## Limits and dependency audit

This is a v6 **core gameplay module**, not the completed graphical v6 release.
The existing `orebunker/index.html` remains the browser preview. Binding this module to the renderer and authoritative server requires further integration.
None of PojavLauncher, Terasology, Cubyz or third-party Minecraft source has been copied.
PojavLauncher is an archived Android launcher rather than a game engine; Terasology and Cubyz are separate engines with incompatible runtimes. Licenses, assets and transitive dependencies must be audited before distributing modified derivatives.
The ORE/Solana mineral labels and scoring are game-only; no real tokens, private keys, wallet signings or on-chain payouts.
