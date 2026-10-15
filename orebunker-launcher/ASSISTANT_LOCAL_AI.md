# OREBunker NPC with optional Ollama

The player can talk to the in-world NPC via `/obguide` (right-click) or `/obassistant`. Rules-based responses are the offline fallback; when enabled the NPC can also answer open questions using a **local Ollama model**.

Install Ollama on the same trusted machine as the Luanti server and obtain a model yourself, e.g. `ollama pull llama3.2:3b`. Start Ollama locally, then enable only the specific mod's HTTP access in `minetest.conf`:

```ini
secure.enable_security = true
secure.http_mods = orebunker_assistant
orebunker_ai_enabled = true
orebunker_ai_model = llama3.2:3b
```

The bridge targets only `http://127.0.0.1:11434/api/chat`, does not accept player-supplied URLs, and sends a redacted question, mode and approximate coordinates. The dialogue module has no autonomous command execution, account signing, wallet access, payment functionality or Solana RPC transaction submission.

Risks: Players on a remote server should be informed that their text and coordinates are processed by the server's Ollama instance. Model output is untrusted and may be wrong; do not follow it for wallet actions. Each player has one outstanding request with an 8-second timeout, and the UI falls back to offline help if unavailable. Rate limiting and stronger persistent per-player permission controls are future security work.

**Status:** Implementation candidate. Luanti native HTTP API runtime, actual local model response and world rendering are not yet independently verified.
