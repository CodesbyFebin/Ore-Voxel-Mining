# Minecraft inspiration audit — selective EdgeORE expansion

**Architecture only; no foreign source code copied.** This phase preserves EdgeORE's Three.js world and texture-atlas greedy mesher, current save system, and disabled ORE spending.

| Upstream | Relevance | Disposition |
| --- | --- | --- |
| EngineHub/WorldEdit | Region selection, fill, undo, schematics | Original bounded editor primitives implemented; no Java code copied |
| overviewer/Minecraft-Overviewer | Minimap and world-map concepts | Original 2D surface buffers implemented; no Python map renderer imported |
| PaperMC/Folia | Partitioned region work scheduling | Existing independent `region-work-queue.ts` |
| CaffeineMC/sodium | Render batching and stable frame times | Concept only; Java renderer incompatible with Three.js |
| MovingBlocks/Terasology | Open voxel gameplay and modularity | Architecture only; JVM runtime not imported |
| PrismarineJS/mineflayer | Bots and agent coordination | Future **server-side opt-in bridge**, not bundled in the browser |
| cuberite/cuberite, pmmp/PocketMine-MP, PaperMC/Paper, GlowstoneMC/Glowstone | Dedicated Minecraft servers | Excluded; EdgeORE is not a Minecraft server |
| SpigotMC/BungeeCord, FabricMC/fabric-api, MinecraftForge/MinecraftForge | Java Minecraft proxies/mods | Excluded |
| docker-archive-public/docker.dockercraft, msmhq/msm, essentials/Essentials, Bukkit/Bukkit | Container and game administration | Excluded; unnecessary privilege surface |
| VazkiiMods/Botania, MightyPirates/OpenComputers, micdoodle8/Galacticraft, ddevault/TrueCraft, lambda-client/lambda, zerite/CraftLib, walterhiggins/ScriptCraft, minefold/hubot-minecraft, leereilly/hubot-minecraft-skin | Inspiration or unrelated runtimes | No direct integration |
| nerdsinspace/nocom-explanation | Potential exploitation-related discussion | Not adopted |

## New safe modules
- `src/game/world-edit.ts`: pure bounded rectangular edits and conflict-aware undo, capped to prevent accidental large mutations.
- `src/game/minimap.ts`: pure surface-height, block-ID and RGBA buffers to feed a future minimap UI.
- `src/game/world-edit.test.ts`: native node tests.

These primitives are **not wired to the live renderer or persistence**. Integrating an editor needs in-game permission/rules, persistent edits, dirty-chunk updates, and undo limits. Integrating a minimap needs a UI overlay and incremental dirty-column updates.

The financial transaction paths remain disabled. This is an isolated incremental integration, not a claim of complete Minecraft compatibility.

Run:
```sh
node --experimental-strip-types --test src/game/world-edit.test.ts src/game/region-work-queue.test.ts
npm run typecheck
```
