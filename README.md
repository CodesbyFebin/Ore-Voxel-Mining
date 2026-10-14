# EdgeORE — Voxel Mining World

[![GitHub Pages](https://github.com/CodesbyFebin/Ore-Voxel-Mining/actions/workflows/pages.yml/badge.svg)](https://github.com/CodesbyFebin/Ore-Voxel-Mining/actions/workflows/pages.yml)

An experimental, browser-playable voxel mining game with a read-only ORE v4 protocol terminal.

**Play (once GitHub Pages deploys):** https://codesbyfebin.github.io/Ore-Voxel-Mining/  
**Direct game route:** https://codesbyfebin.github.io/Ore-Voxel-Mining/game/

> **Transparency:** Virtual block rewards and coins are not ORE. Wallet signing, Deploy, Checkpoint and Claim remain disabled. No real ORE mining or earnings are implied.

## Game

The landing page starts the voxel game. Explore and mine local blocks, craft, and use two portal pairs: Crystal Valley ↔ Amethyst Abyss (purple) and Crystal Valley ↔ Ember Depths (orange). Mouse look may need a click to lock. The ORE board is informational only, subject to public RPC availability.

## Development

```bash
npm ci
npm run dev
```

This project has a server-capable TanStack Start/Vite build and a **separate static Pages build**. Do not run the normal Nitro/Vercel build for GitHub Pages.

```bash
npx vite build --config vite.pages.config.ts
node scripts/pages-finalize.mjs
```

Deployment: [Hosting guide](docs/HOSTING.md) · [Pages workflow](.github/workflows/pages.yml) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md).

## Testing status

Pages build/deployment, mobile compatibility, terrain and portal reload behavior, and real-RPC access require live checks before public release claims. Do not infer that a green syntax check verifies runtime behavior.

Developed by [CodesbyFebin](https://github.com/CodesbyFebin). Inspired by voxel sandbox games; not affiliated with Mojang/Microsoft or endorsed by ORE developers.
