export type BlockDef = {
  id: number;
  name: string;
  color: string;
  speck: string;
  hardness: number;
  tier: number;
  coins: number;
  drop: number;
  placeable: boolean;
};

export const AIR = 0;

export const BLOCKS: BlockDef[] = [
  { id: 0, name: "Air", color: "#000", speck: "#000", hardness: 0, tier: 0, coins: 0, drop: 0, placeable: false },
  { id: 1, name: "Cave moss", color: "#1c4a42", speck: "#14f195", hardness: 0.35, tier: 0, coins: 0, drop: 2, placeable: true },
  { id: 2, name: "Slate", color: "#3a342c", speck: "#6b5a48", hardness: 0.3, tier: 0, coins: 0, drop: 2, placeable: true },
  { id: 3, name: "Basalt", color: "#24303c", speck: "#5eead4", hardness: 0.9, tier: 0, coins: 1, drop: 3, placeable: true },
  { id: 4, name: "Coal", color: "#1c2128", speck: "#3a4450", hardness: 1.05, tier: 0, coins: 2, drop: 4, placeable: true },
  { id: 5, name: "Copper", color: "#6a3a22", speck: "#ff8833", hardness: 1.35, tier: 1, coins: 6, drop: 5, placeable: true },
  { id: 6, name: "Iron", color: "#4a5560", speck: "#d7c4a8", hardness: 1.5, tier: 1, coins: 8, drop: 6, placeable: true },
  { id: 7, name: "Lava crust", color: "#5a240e", speck: "#ff8833", hardness: 1.7, tier: 2, coins: 12, drop: 7, placeable: true },
  { id: 8, name: "Gold", color: "#6a5018", speck: "#ffd56a", hardness: 1.9, tier: 2, coins: 25, drop: 8, placeable: true },
  { id: 9, name: "Prism", color: "#145a58", speck: "#b8fff0", hardness: 2.5, tier: 3, coins: 80, drop: 9, placeable: true },
  { id: 10, name: "Verdant", color: "#14523a", speck: "#3dff9a", hardness: 2.6, tier: 3, coins: 120, drop: 10, placeable: true },
  { id: 11, name: "Crystal", color: "#0e4e62", speck: "#00e5d4", hardness: 2.1, tier: 2, coins: 30, drop: 11, placeable: true },
  { id: 12, name: "Glow Ore", color: "#0e3d34", speck: "#14f195", hardness: 2.8, tier: 4, coins: 60, drop: 12, placeable: true },
  { id: 13, name: "Timber", color: "#4a301c", speck: "#c48a58", hardness: 0.55, tier: 0, coins: 1, drop: 13, placeable: true },
  { id: 14, name: "Canopy", color: "#16321c", speck: "#3d8a32", hardness: 0.2, tier: 0, coins: 0, drop: 0, placeable: true },
  { id: 15, name: "Sand", color: "#8a7048", speck: "#efe0b0", hardness: 0.3, tier: 0, coins: 0, drop: 15, placeable: true },
  { id: 16, name: "Geode", color: "#2a1840", speck: "#c084fc", hardness: 3.4, tier: 4, coins: 40, drop: 16, placeable: true },
  { id: 17, name: "Bedrock", color: "#101418", speck: "#2a3038", hardness: Infinity, tier: 99, coins: 0, drop: 0, placeable: false },
  { id: 18, name: "ORE Terminal", color: "#06362f", speck: "#14f195", hardness: Infinity, tier: 99, coins: 0, drop: 0, placeable: false },
  { id: 19, name: "Entropy Vault", color: "#062a38", speck: "#00e5d4", hardness: Infinity, tier: 99, coins: 0, drop: 0, placeable: false },
  { id: 20, name: "Amethyst Gate", color: "#3a1860", speck: "#c084fc", hardness: Infinity, tier: 99, coins: 0, drop: 0, placeable: false },
  { id: 21, name: "Ember Gate", color: "#5a240e", speck: "#ff8833", hardness: Infinity, tier: 99, coins: 0, drop: 0, placeable: false },
  { id: 22, name: "Magma", color: "#7a2208", speck: "#ffb703", hardness: 1.15, tier: 1, coins: 4, drop: 22, placeable: true },
  { id: 23, name: "Relic", color: "#4a2080", speck: "#ffd56a", hardness: 3.1, tier: 4, coins: 0, drop: 23, placeable: false },
  { id: 24, name: "Bunker plate", color: "#1a2420", speck: "#8aa899", hardness: 4.2, tier: 2, coins: 0, drop: 24, placeable: true },
  { id: 25, name: "Lantern", color: "#3a3010", speck: "#ffe08a", hardness: 0.4, tier: 0, coins: 0, drop: 25, placeable: true },
  { id: 26, name: "Medkit", color: "#6a2030", speck: "#ff8aa0", hardness: 0.2, tier: 0, coins: 0, drop: 26, placeable: false },
  { id: 27, name: "Crystal key", color: "#0e4e62", speck: "#b8fff0", hardness: 0.4, tier: 0, coins: 0, drop: 27, placeable: false },
  { id: 28, name: "Amethyst core", color: "#3a1860", speck: "#e9d5ff", hardness: 0.4, tier: 0, coins: 0, drop: 28, placeable: false },
  { id: 29, name: "Ember shard", color: "#5a240e", speck: "#ffb703", hardness: 0.4, tier: 0, coins: 0, drop: 29, placeable: false },
];

export const BLOCK_COUNT = BLOCKS.length;

export type Pickaxe = {
  name: string;
  speed: number;
  cost: number;
  durability: number;
  color: string;
};

export const PICKAXES: Pickaxe[] = [
  { name: "Wooden", speed: 1, cost: 0, durability: 80, color: "#8b6f47" },
  { name: "Stone", speed: 2, cost: 40, durability: 160, color: "#9aa0a8" },
  { name: "Iron", speed: 3.5, cost: 180, durability: 280, color: "#d5d8de" },
  { name: "Gold", speed: 6, cost: 520, durability: 90, color: "#ffd56a" },
  { name: "Prism", speed: 9, cost: 2000, durability: 420, color: "#7dffe0" },
  { name: "Voidsteel", speed: 12, cost: 6400, durability: 640, color: "#c084fc" },
  { name: "Crystal Edge", speed: 16, cost: 14000, durability: 820, color: "#67e8f9" },
  { name: "Sol Forge", speed: 20, cost: 28000, durability: 1100, color: "#e8a06a" },
];

export function block(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[0];
}
