# In-Game OreBunker Assistant (NPC)

Install the native OreBunker Luanti game using the repository's launcher, then enter a world.

- `/obguide`: spawn a non-combat guide entity beside the player.
- Right-click the NPC to open its chat panel.
- `/obassistant`: open the same assistant remotely.

The first implementation is a **deterministic, offline knowledge assistant**, not a connected generative model. It answers mining, ORE Hunt, rigs, position and wallet safety questions. Responses are context-aware for current player coordinates and selected mode.

The NPC does not see or manage wallet keys, browser state, private messages, Solana RPC data or on-chain balances. Real ORE mining/wallet actions must use a separate explicitly authorized wallet service.

Future local LLM implementation: a separately audited local Ollama gateway can receive consented, redacted question text through an authenticated API. Never expose arbitrary localhost URLs to untrusted remote players, and never execute generated commands directly. Limit agent actions to a server-authorized allowlist with quotas and audit receipts.

Current source status: committed for review; native Luanti gameplay not run in this environment.
