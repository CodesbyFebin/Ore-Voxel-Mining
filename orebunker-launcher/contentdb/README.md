# ContentDB sourcing policy for OreBunker

The upstream ContentDB application at https://github.com/luanti-org/contentdb
is the **platform source code**, not a redistributable archive of every mod/game.
https://content.luanti.org/ is the package catalog.

A package must be explicitly selected for compatibility and license compliance.
Do NOT mirror or vendor all ContentDB package files.

Initial candidate components:
- luanti-org/minetest_game: baseline default/flowers/creative/survival code; independently
  check license text and required game/module coupling before copying.
- Ethereal world generation: treat previously uploaded Ethereal content as a separately
  licensed optional dependency; verify upstream author/license and compatibility.
- Mesecons and other machine mods: separate review; do not bundle until approved.
- OreBunker own `orebunker_core` remains self-contained and is installed by launcher.

Proposed license gate:
1. Verify exact ContentDB package URL and author.
2. Record immutable upstream release version / SHA-256.
3. Inspect source, media and texture license terms separately.
4. Verify required / optional mods and target Luanti version.
5. Test server launch, craft/inventory integration, terrain and multiplayer.
6. Write THIRD_PARTY_NOTICES and copy only approved dependency.
7. Never interpret the ContentDB backend license as granting rights over hosted content.

No external game mods have been extracted into this manifest.
