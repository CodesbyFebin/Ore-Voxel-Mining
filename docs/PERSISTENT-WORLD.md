# EdgeORE persistent-world foundation

## Decision: IndexedDB first, SQLite/native later

The currently deployed world remains a bounded 48×24×48 Three.js environment with 16×16 horizontal meshing. A full 3D streaming/infinite world and Godot client are **not** implemented.

The browser storage adapter in `src/game/storage/indexeddb-chunks.ts` uses an IndexedDB `chunks` store keyed by JSON-encoded [world, cx, cy, cz], with versioned records and 4096-byte 16³ voxel payloads. Compression uses the native `deflate` stream (not `deflate-raw`, which is not supported consistently across browsers); fallback records remain raw. Compression completes **before** opening the short IndexedDB readwrite transaction, and the batch resolves on **transaction completion**, not individual request success. Reads validate decompressed length. Browser persistence can be requested through `requestPersistence()` from a user-initiated settings action.

**Important current limitation:** the game uses existing `edgeore-voxel-v1` localStorage edits as the authoritative gameplay state. An asynchronous, debounced chunk snapshot mirror is now written to IndexedDB when the game saves. There is no automatic restoration from that mirror, migration, world-wide export or crash-recovery guarantee yet. Do not delete localStorage saves. On storage failure the snapshot write is best-effort and existing local save behavior continues.

## Next engineering gates

1. Build a dual-read migration and world metadata/schema with explicit versioning, completion marks, checksums, and recovery after interrupted writes.
2. Persist player position and machine entities (inventory/power/recipes) transactionally with world changes. Add a refresh/restart fixture proving exact reload.
3. Implement seed-derived chunk generation independent of the existing bounded world, streaming LRU cache, mesh-worker messages and progressive loading.
4. Extend for negative Y coordinates, biome-specific strata, geological veins and protected in-world ORE terminals.
5. Migrate native storage behind the same `ChunkStore` contract to SQLite/WAL or region files. Never import Node `fs` or native `better-sqlite3` into the browser bundle.
6. Server-authoritative multiplayer is a separate trust boundary and must not treat these client-side world backups as consensus.
7. Real ORE balances/transactions remain independent of local game inventory and machine simulation; spending/signing stays disabled.

## Design correctness notes

Region files have 32×32 column chunks and sector-table constraints (8-bit sector count, 24-bit offset); simply appending every write causes unbounded growth without compaction and recovery. For browser deployments, IndexedDB provides transactional storage without directly managing sectors. Browser storage may still be evicted unless persistence is granted, and quota errors need a visible status in a future Settings page.
