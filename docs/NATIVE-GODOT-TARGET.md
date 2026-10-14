# EdgeORE — proposed Godot 4 / Rust native target

Status: **architecture plan; no native client has been built, run or shipped**.

The existing Three.js game remains the working gameplay branch. A future Godot 4 client can adopt Godot scene nodes, input, animation and GPU rendering while a Rust GDExtension owns deterministic world algorithms and SQLite-based persistence.

## Runtime ownership and thread boundaries

- **Main Godot thread:** create and mutate Node3D, MeshInstance3D, ArrayMesh, PackedVector arrays, UI nodes and terminal widgets.
- **Rust workers:** generate numeric voxel block buffers, compress/decompress chunk bytes, compute plain Rust vertex/index arrays, query the read-only Solana RPC. Workers communicate via bounded channels and carry **no Godot engine objects**.
- **Render scheduler:** consume at most a bounded number of completed meshes per frame; discard stale generation revisions and cancel jobs for unloaded chunks.
- **ChunkStore:** an abstract `load(cx,cy,cz)` and `save(batch)` interface; implement SQLite/WAL with versioned serialized values. Coordinate Y is signed and uses floor division so Y=-1 maps to cy=-1, localY=15.
- **Game authority:** single-player saves initially; any future competitive multiplayer must use a separate authoritative server and not trust client IndexedDB or local SQLite.
- **Solana worker:** pinned, independently verified program identifiers, account owners and layouts; read-only status and errors only; zero signer/key custody.

## Migration plan

1. Finish browser persistence restoration, including saving player pose, block edits and machine states, with an integration test that refreshes the game.
2. Implement contiguous vertical coordinate system **Y ∈ [-64,128)**, strata keyed by cubic `(cx,cy,cz)`. Crystal Valley cy 4..7, Amethyst Abyss cy 0..3, Ember Depths cy -4..-1. Existing portals are separate scenes today and must not be silently reinterpreted as connected caves.
3. Create shared terrain/crafting schema and deterministic golden test seeds before porting terrain generation.
4. Prototype Godot `VoxelWorldManager` + Rust voxel generation + plain array meshing with worker threads; verify SDK/toolchain compatibility and native binaries on Windows, Linux and macOS.
5. Add SQLite migrations, bounded chunk queues, memory budgets, save checksums, replay tests and benchmarks before promising infinite terrain.
6. Expose read-only ORE status through a narrow interface; no signed transaction automation, implied DrillX proof submission or gameplay-triggered wallet spend.

## Upstream specification cautions

The contributed Rust snippet uses an unpinned `godot-rust/gdext` master branch and old example dependencies. Choose pinned compatible versions for the installed Godot version and test in CI; **do not assert the draft compiles**. Its worker-side use of Godot `PackedVector3Array` should be replaced with Rust-native `Vec<[f32;3]>` buffers, constructed into Godot mesh arrays on the main thread. Do not use the placeholder `mineRHF...` identifier from the draft ORE monitor; read the exact audited addresses from a pinned protocol manifest.

## Current incremental implementation

- `src/game/vertical-strata.ts`: future signed chunk key helpers; not wired into the existing three discrete worlds.
- `src/game/storage/save-state.ts`: validated player pose and versioned machine-record shape.
- `src/game/engine.ts`: v3 local save now persists/restores player pose, preserving inventory, per-world block edits and dimension. Five-second periodic save while active, plus blur/dispose. IndexedDB remains a secondary compressed block snapshot, not yet authoritative or independently restorable.
