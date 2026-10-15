# OreBunker.com — Luanti Desktop Launcher (developer preview)

This is an **independent, unofficial community project**, not the official Luanti or Solana/ORE launcher.

## Requirements
- Python 3.9+ with Tkinter
- Installed Luanti desktop engine (not bundled)
- Linux, macOS or Windows desktop; the program detects common macOS and PATH binaries
- Optional manual executable selector

## Start
`python3 launcher.py` (Windows: `py launcher.py`)

Select Survival, Creative or ORE Hunt (60s). Choose the engine executable if auto-detection fails, then click **Launch OreBunker**.

The launcher copies its standalone game to an isolated user-data directory and uses per-mode worlds.
- Linux: `~/.orebunker`
- macOS: `~/Library/Application Support/OreBunker`
- Windows: `~/.orebunker`

## Gameplay
Includes Lua-defined coal, diamond, ORE and Solana-themed fictional blocks, an initial pickaxe, procedural ore registration and local 60-second ready-up hunting with `/obready` and `/obscore`. The ORE Hunt implementation is an **early server-controlled scoring prototype**, not an anti-cheat-hardened tournament: players can dig outside the arena and ore-score validation relies on Luanti node callbacks.

## Known limits
- The Lua game is intentionally minimal. It lacks polished terrain, advanced textures, crafting and a finished UI.
- The launcher does not install the Luanti engine, compile Android APKs, or expose a public multiplayer service.
- Unverified on a graphical desktop and native Luanti 5.17.
- No private keys, wallet integration, token issuance, SOL spending or real hashrate mining.
- No Luanti binary, Mojang assets, PojavLauncher source, Cubyz or Terasology code is distributed.

## Launch troubleshooting
Use an **executable** binary path, not the `.app` directory itself. If `--go --world` is unsupported by the installed engine, open Luanti's main menu and select the OreBunker game and corresponding world in the isolated data directory. Read `minetest.conf` and Luanti CLI documentation for your installed release.

## License
New launcher and original game code: MIT. Luanti engine and external game content remain under their separate licenses. Artwork and brand marks require independent review before commercial release.
