# Public Playtest — Voxel Portals and ORE Grid

## Test route

Landing: https://codesbyfebin.github.io/Ore-Voxel-Mining/  
Game: https://codesbyfebin.github.io/Ore-Voxel-Mining/game/

Public URLs become usable only after the Pages deployment succeeds. GitHub Pages must be enabled with **Source: GitHub Actions** in repository settings.

## Test scenario

1. Select **Launch Game** on the landing page; the world should load at `/game/`.
2. Click the scene to enable mouse look. Move with WASD, mine blocks and test basic controls.
3. Walk into a **purple portal** in Crystal Valley. Press **P** or tap the on-screen portal button.
4. The game should enter **Amethyst Abyss** and automatically open the **ORE Grid terminal**.
5. Read the grid and status indicators. Network data may be unavailable if RPC fails; do not substitute invented values.
6. Close the terminal; gameplay should resume in Amethyst Abyss. Use the purple portal to return to Crystal Valley; the terminal should appear after that return as well.
7. Repeat with the **orange portal** and **Ember Depths**. Orange connects only Ember Depths and Crystal Valley.
8. Test the **F** shortcut or USE TERMINAL where available. This opens the same read-only panel independently of portals.
9. Reload `/game/` and check saving and performance in your browser.

## No financial transactions

The grid is **read-only**. Virtual block drops are not ORE cryptocurrency. Deploy, checkpoint, claim and wallet signing must remain unavailable. No real SOL is spent. A successful playtest means portal routing, terminal visibility and game controls work; it does not prove on-chain mining.

## Reporting issues

Open a GitHub issue with browser/OS, device, steps to reproduce, expected and actual outcome, and a screenshot or console message if available. Never upload private keys or recovery phrases.

## Release checklist

- [ ] GitHub Pages build and deploy passed
- [ ] Both public URLs return the game and required JS/CSS assets
- [ ] Desktop initial gameplay works
- [ ] Purple world and return portal trigger the ORE grid
- [ ] Orange world and return portal trigger the ORE grid
- [ ] Closing terminal restores controls
- [ ] Mobile touch portal action works
- [ ] No transaction signature request or SOL debit is possible
