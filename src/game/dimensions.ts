export type DimensionId = "valley" | "geode" | "ember";

export type DimensionDef = {
  id: DimensionId;
  name: string;
  label: string;
  seedOffset: number;
  tint: number;
  sky: number;
  fog: number;
  services: boolean;
};

/** Same three worlds and seed offsets as the v4.3 portal page. */
export const DIMENSIONS: Record<DimensionId, DimensionDef> = {
  valley: { id: "valley", name: "Crystal Valley", label: "CRYSTAL VALLEY", seedOffset: 0, tint: 0x00e5d4, sky: 0x041018, fog: 0x0c2430, services: true },
  geode: { id: "geode", name: "Amethyst Abyss", label: "AMETHYST ABYSS", seedOffset: 370019, tint: 0xaf65ff, sky: 0x120818, fog: 0x241038, services: true },
  ember: { id: "ember", name: "Ember Depths", label: "EMBER DEPTHS", seedOffset: 810037, tint: 0xff762f, sky: 0x140804, fog: 0x2a140c, services: true },
};

export type PortalPlan = { to: DimensionId; tint: number; x: number; z: number };

/**
 * Purple is only Crystal Valley ↔ Amethyst Abyss.
 * Orange is only Crystal Valley ↔ Ember Depths.
 * Gates sit clear of the terminal court.
 */
export function portalPlans(id: DimensionId, center = 24): PortalPlan[] {
  const purple = { x: center + 14, z: center + 12, tint: DIMENSIONS.geode.tint };
  const orange = { x: center - 14, z: center + 12, tint: DIMENSIONS.ember.tint };
  if (id === "valley") {
    return [
      { ...purple, to: "geode" },
      { ...orange, to: "ember" },
    ];
  }
  if (id === "geode") return [{ ...purple, to: "valley" }];
  return [{ ...orange, to: "valley" }];
}

export function dimensionSeed(base: number, id: DimensionId): number {
  return (base + DIMENSIONS[id].seedOffset) >>> 0;
}

export function isDimensionId(value: string): value is DimensionId {
  return value === "valley" || value === "geode" || value === "ember";
}
