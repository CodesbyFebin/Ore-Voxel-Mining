export type ForgeRecipe = {
  id: string;
  name: string;
  detail: string;
  need: Array<[number, number]>;
  give: [number, number];
};

/** Game items only. None of these mint ORE or move SOL. */
export const FORGE: ForgeRecipe[] = [
  { id: "prism", name: "Prism", detail: "4 crystal. A denser game gem, not ORE.", need: [[11, 4]], give: [9, 1] },
  { id: "glow", name: "Glow ore", detail: "2 geode and 1 coal.", need: [[16, 2], [4, 1]], give: [12, 1] },
  { id: "magma", name: "Magma brick", detail: "3 lava crust. Placeable. Standing on it burns game health.", need: [[7, 3]], give: [22, 1] },
  { id: "bunker", name: "Bunker plate", detail: "4 basalt and 2 iron. A shelter block. Not a wallet.", need: [[3, 4], [6, 2]], give: [24, 1] },
  { id: "lantern", name: "Lantern", detail: "2 timber, 1 coal, 1 crystal. Light for the cave. Not ORE.", need: [[13, 2], [4, 1], [11, 1]], give: [25, 1] },
  { id: "medkit", name: "Medkit", detail: "3 coal and 1 timber. Press Q to restore game health.", need: [[4, 3], [13, 1]], give: [26, 1] },
  { id: "key", name: "Crystal key", detail: "2 crystal. Cheap descent into the abyss. Not a wallet key.", need: [[11, 2]], give: [27, 1] },
  { id: "core", name: "Amethyst core", detail: "3 geode. Opens the shaft from the abyss into the depths.", need: [[16, 3]], give: [28, 1] },
  { id: "shard", name: "Ember shard", detail: "4 lava crust and 2 gold. The expensive climb back to the valley.", need: [[7, 4], [8, 2]], give: [29, 1] },
];

export function tryForge(
  counts: Record<number, number>,
  id: string,
): { ok: true; counts: Record<number, number> } | { ok: false; reason: string } {
  const recipe = FORGE.find((entry) => entry.id === id);
  if (!recipe) return { ok: false, reason: "Unknown recipe." };
  for (const [blockId, amount] of recipe.need) {
    if ((counts[blockId] ?? 0) < amount) return { ok: false, reason: "Missing materials." };
  }
  const next = { ...counts };
  for (const [blockId, amount] of recipe.need) {
    next[blockId] = (next[blockId] ?? 0) - amount;
    if (next[blockId] <= 0) delete next[blockId];
  }
  const [giveId, giveN] = recipe.give;
  next[giveId] = (next[giveId] ?? 0) + giveN;
  return { ok: true, counts: next };
}
