# GitHub Pages hosting

**Expected URL:** https://codesbyfebin.github.io/Ore-Voxel-Mining/

**Game URL:** https://codesbyfebin.github.io/Ore-Voxel-Mining/game/

This is a static client build. Server-only preview authentication, PGLite/database functions, and OAuth endpoints are NOT deployed to GitHub Pages. Do not treat it as a replacement for backend hosting.

## Enable

GitHub repo Settings → Pages → Build and deployment → Source: **GitHub Actions**. Then run the **GitHub Pages — EdgeORE playable build** workflow or push to main. The workflow will publish a static build for both landing and game routes. It requires GitHub Pages permissions/settings enabled on the repository.

## Safety and transparency

Gameplay coins and blocks are browser-local. The ORE board is informational. Real ORE Deploy, Checkpoint, Claim and financial transaction signing are disabled. No wallet seeds or signing keys belong in the repository or browser variables. The live chain feed can be unavailable if upstream public RPC rate limits or CORS policies reject traffic.

## Validation

Review the Actions build/deploy statuses; then visit both URLs directly, navigate from landing, reload /game/, test WASD, mouse lock, mobile controls, world/portal continuity, and inspect browser console for asset failures. This deploy must not be announced as production verified until tests pass.
