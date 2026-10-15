# OREBunker real wallet integration boundary

Real SOL/ORE cryptocurrency transactions are requested. The native Luanti game does **not** have access to wallet keys or signing APIs. The game economy, virtual rigs and arena scores remain fictional.

An on-chain companion must use a secure HTTPS origin, Wallet Standard / Mobile Wallet Adapter where appropriate, verified token mint and on-chain program IDs, an independent current ORE SDK/IDL audit, exact v0 message review binding, wallet-mediated signatures, and explicit user confirmation before a mainnet broadcast.

Official resources:
- https://github.com/regolith-labs/ore
- https://solana.com/docs/frontend/web3-compat
- https://github.com/solana-foundation/solana-web3.js

**State:** Live ORE protocol mining and SOL/ORE sending are **not enabled by this patch**. This is not an endorsement or verified on-chain integration. The UI must never claim real rewards based on fictional digging or hashrate.
