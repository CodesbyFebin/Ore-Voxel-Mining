# Native engine integration qualification

Status: **SOURCE-INTEGRATED / BUILD NOT VERIFIED**

The Linux native build script downloads the official Luanti engine at a pinned
version, compiles the client and server with CMake/Ninja, then stages the
original OreBunker Lua game under `games/orebunker`.

The workflow is a build candidate, not evidence that native binaries were
successfully produced. Upstream dependencies may differ by OS and release;
a CI pass and device smoke test are required.

Existing official repositories inventoried:
- luanti, minetest_game, luanti-org.github.io, minetestmapper
- contentdb, serverlist, blog, docs.luanti.org
- modtools, forum.luanti.org_template1, benchmarks, luma
- luanti_android_deps, luanti_ios_deps, flint, luanti_macos_deps

The official GitHub organization is not a collection of 16 Minecraft mods.
An exhaustive download of external ContentDB user-created packages has **not**
been performed. Individual mod approvals require their own license records.

No upstream C++ source has been copied into OreBunker; the build script fetches
Luanti from its official repository at build time. Lua game still needs live
engine tests for mapgen, textures, inventory, multiplayer and matchmaking.
