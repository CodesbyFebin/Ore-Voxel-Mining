# Hacking Minecraft → EdgeORE selective integration roadmap

**Scope**: review of the repositories in the user's “Hacking Minecraft” list, as architectural inspiration for an existing Three.js/TypeScript game. No Minecraft Java/C++/C#/PHP plugins or source have been copied into EdgeORE.

## Prioritization

| Priority | Project(s) | EdgeORE adaptation | Integration |
| --- | --- | --- | --- |
| P1 | EngineHub/WorldEdit | Browser-native voxel select / fill / undo / blueprint editing; validate bounds, transaction size and edit quotas | Clean-room TS module after snapshot-based undo tests |
| P1 | CaffeineMC/sodium | Profile draw calls and frame-time; chunk dirty invalidation, atlas reuse, visibility culling and efficient geometry updates | Existing `src/game/mesher.ts` and rendering engine; do not import Java mod |
| P1 | overviewer/Minecraft-Overviewer | 2D top-down map derived from EdgeORE world voxels and discovery status | New Canvas-based local map; never parse actual Minecraft world format without a separate importer |
| P2 | PrismarineJS/mineflayer | Optional deterministic local NPC agents, pathfinding, mining assignments | Independent game AI using in-game intent API; do not assume Mineflayer can control Three.js directly |
| P2 | MightyPirates/OpenComputers; walterhiggins/ScriptCraft | Safe in-game programmable machinery | Declarative DSL with CPU and permission budgets, no arbitrary JS execution |
| P2 | MovingBlocks/Terasology; VazkiiMods/Botania; micdoodle8/Galacticraft | Modular realms, nature-themed crafting, portals, progression | New original game mechanics/assets; no import of mod assets |
| P3 | cuberite/cuberite; PaperMC/Paper; GlowstoneMC/Glowstone; pmmp/PocketMine-MP | Dedicated authoritative multiplayer service | Evaluate only if multiplayer roadmap warrants a protocol bridge; not usable as EdgeORE browser server |
| P3 | SpigotMC/BungeeCord; FabricMC/fabric-api; MinecraftForge/MinecraftForge; Bukkit/Bukkit; essentials/Essentials | Plugin-based server extensions | Not applicable to Three.js runtime; could matter only with a separate actual Minecraft compatibility service |
| P3 | docker-archive-public/docker.dockercraft; msmhq/msm; minefold/hubot-minecraft; leereilly/hubot-minecraft-skin; ddevault/TrueCraft; flowtender/MachineMusePowersuits; Zerite/CraftLib; lambda-client/lambda; nerdsinspace/nocom-explanation | No essential browser game dependency identified | Exclude from core; review licenses and security before any later incorporation |

## Immediate non-invasive engineering path
1. Preserve existing atlas-aware greedy meshing and chunk scheduling boundaries; benchmark first, then optimize.
2. Add a bounded local map generator and a standalone edit planner before attaching either to UI state.
3. Test undo/redo, cross-chunk boundaries, edit size limits, save/load determinism and device performance.
4. Re-evaluate any direct source copying against the **exact versioned license** of each repo; clean-room implementation is preferable to mixing heterogeneous license obligations.
5. Keep ORE financial operations disabled. Gameplay points and mined blocks are not on-chain ORE.

## Unsafe integration exclusions
Never adapt projects' remote-shell command endpoints, arbitrary admin-command execution, weak API keys, unsandboxed scripting or client-trusted multiplayer actions. Use bounded APIs with authentication, roles and audit logs.

## Current delivery boundary
Architectural review only; not a claim that Minecraft server software, actual cross-game multiplayer compatibility, bot integration or new game UI has been merged. Existing `src/game/region-work-queue.ts` is a separate preparatory module, not a full engine replacement.
