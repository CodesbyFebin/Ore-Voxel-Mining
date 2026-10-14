import type { DimensionId } from "./dimensions.ts";

export type ShaftLink = {
  to: DimensionId;
  item: number;
  itemName: string;
  verb: "descend" | "ascend";
};

/** One-way shaft. Descent is a cheap key. The climb back costs the ember shard. */
export const SHAFT: Record<DimensionId, ShaftLink> = {
  valley: { to: "geode", item: 27, itemName: "Crystal key", verb: "descend" },
  geode: { to: "ember", item: 28, itemName: "Amethyst core", verb: "descend" },
  ember: { to: "valley", item: 29, itemName: "Ember shard", verb: "ascend" },
};

/** Same column in every world. Derived from the save seed, not the dimension seed. */
export function shaftColumn(layoutSeed: number): { x: number; z: number } {
  let h = (Math.imul(layoutSeed | 0, 31) + 7) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  let x = 8 + (h % 21);
  let z = 8 + ((h >>> 8) % 21);
  if (Math.hypot(x - 24, z - 24) < 9) {
    x = 12;
    z = 38;
  }
  return { x, z };
}
