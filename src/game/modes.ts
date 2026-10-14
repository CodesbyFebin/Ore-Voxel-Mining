export type GameMode = "solo" | "community" | "pool" | "bunker";

export const GAME_MODES: Record<GameMode, { label: string; detail: string }> = {
  solo: {
    label: "Solo",
    detail: "Your cave and your miner coins. Nothing is shared.",
  },
  community: {
    label: "Community",
    detail: "Mined coins also fill a chest shared by tabs on this device. Miner coins only. Not an ORE pool and not SOL.",
  },
  pool: {
    label: "Pool practice",
    detail: "Ore breaks fill a local meter. At 100 it pays a lantern. No other wallets. Not a Solana mining pool.",
  },
  bunker: {
    label: "Bunker",
    detail: "Darker caves, magma hurts more, and you can forge shelter plates. Still a game. Still not ORE.",
  },
};
