# Optional Minecraft-inspired integrations for EdgeORE

This branch uses a **selective, clean-room architectural merge**, not source-code amalgamation.

| Source repository | License observed | Decision | Reason |
| --- | --- | --- | --- |
| [astral123457/SolanaDevMinecraft](https://github.com/astral123457/SolanaDevMinecraft) | GPL-3.0 | **Do not vendor** | Java/PHP server deployment instructions include remotely supplied shell commands, permissive Docker socket access and sudo privileges; cannot be imported into browser app or treated as wallet infrastructure. |
| [astral123457/Folia](https://github.com/astral123457/Folia) | Check relevant upstream license tree | **Concept adapted** | Independent region work queues and chunk-border invalidation; no Folia source imported and no claim to real multithreaded simulation. |
| [astral123457/bedrock-protocol](https://github.com/astral123457/bedrock-protocol) | MIT | **Optional future sidecar only** | Bedrock uses RakNet and protocol-specific authentication; not compatible with EdgeORE's Three.js client directly. Any bridge must be server-side, opt-in, authenticated and rate limited. |
| [astral123457/PanelMinecraft](https://github.com/astral123457/PanelMinecraft) | GPL-3.0 | **Do not vendor** | The server-administration patterns grant powerful systemctl operations; EdgeORE does not need remote shell/host controls. |

## Implemented
- `src/game/region-work-queue.ts`: deterministic bounded queue for dirty chunk rebuilds, duplicate suppression, priorities and seam-neighbor scheduling.
- `src/game/region-work-queue.test.ts`: pure unit tests, matching the project's `node --experimental-strip-types --test` convention.

## Integration boundary
This queue is **not wired into rendering** yet; use it only after verifying the engine's mesh disposal, atlas UV preservation and synchrony assumptions. In particular, it is not a replacement for `src/game/mesher.ts`'s existing greedy texturing. To activate later, enqueue mutations and drain a measured number of chunk jobs per animation frame, with a synchronous fallback for collision and visibility critical edits.

## Security and release
Do not use SolanaDevMinecraft's example commands, remote command endpoints, root/MySQL credentials, key-generation endpoints, or Docker socket changes in EdgeORE. Preserve `spendingDisabled()` and `ALLOW_FINANCIAL_OPERATIONS = false`. No GitHub-repository merge licenses permissions to publish proprietary Minecraft assets or to use Minecraft trademarks.

## Validate
```sh
node --experimental-strip-types --test src/game/region-work-queue.test.ts
npm run typecheck
npm test
```
Status: added as isolated, testable code; no live integration, multiplayer service or CI success claimed.
