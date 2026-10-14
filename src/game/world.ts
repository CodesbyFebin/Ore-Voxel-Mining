import { AIR, BLOCKS } from "./blocks.ts";
import { type DimensionId, DIMENSIONS, portalPlans } from "./dimensions.ts";
import { shaftColumn } from "./shaft.ts";

export const WX = 48;
export const WY = 24;
export const WZ = 48;
export const CHUNK = 16;
export const CHUNKS_X = WX / CHUNK;
export const CHUNKS_Z = WZ / CHUNK;

export function idx(x: number, y: number, z: number): number {
  return x + z * WX + y * WX * WZ;
}

export function inWorld(x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < WX && y < WY && z < WZ;
}

function hash(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(y | 0, 1442695041) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x: number, z: number, seed: number, scale: number): number {
  const nx = x / scale;
  const nz = z / scale;
  const ix = Math.floor(nx);
  const iz = Math.floor(nz);
  const fx = nx - ix;
  const fz = nz - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const v00 = hash(ix, 0, iz, seed);
  const v10 = hash(ix + 1, 0, iz, seed);
  const v01 = hash(ix, 0, iz + 1, seed);
  const v11 = hash(ix + 1, 0, iz + 1, seed);
  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return a + (b - a) * sz;
}

export type PortalSite = {
  to: DimensionId;
  tint: number;
  anchorX: number;
  anchorZ: number;
  baseY: number;
  x: number;
  y: number;
  z: number;
};

export type WorldData = {
  seed: number;
  dimension: DimensionId;
  services: boolean;
  generated: Uint8Array;
  blocks: Uint8Array;
  spawn: { x: number; y: number; z: number };
  terminal: { x: number; y: number; z: number };
  vault: { x: number; y: number; z: number };
  portals: PortalSite[];
  shaft: { x: number; y: number; z: number };
};

function set(buf: Uint8Array, x: number, y: number, z: number, id: number) {
  if (inWorld(x, y, z)) buf[idx(x, y, z)] = id;
}

export function generateWorld(seed: number, dimension: DimensionId = "valley", layoutSeed = seed): WorldData {
  const blocks = new Uint8Array(WX * WY * WZ);
  const surface = new Int16Array(WX * WZ);
  for (let z = 0; z < WZ; z++) {
    for (let x = 0; x < WX; x++) {
      const n = noise2(x, z, seed, 14) * 5 + noise2(x, z, seed + 19, 6) * 2;
      let h = Math.floor(11 + n);
      if (h < 4) h = 4;
      if (h > WY - 6) h = WY - 6;
      const river = Math.abs(z - (18 + noise2(x, 0, seed + 3, 10) * 8));
      if (river < 1.4) h = Math.min(h, 8);
      surface[x + z * WX] = h;
      for (let y = 0; y < WY; y++) {
        let id = AIR;
        if (y === 0) id = 17;
        else if (y < h - 4) id = 3;
        else if (y < h) id = river < 1.6 && y >= h - 2 ? 15 : 2;
        else if (y === h) id = river < 1.6 ? 15 : 1;
        if (id === 3 || id === 2) {
          const depth = h - y;
          const ore = rollOre(dimension, depth, x, y, z, seed);
          if (ore) {
            id = ore;
            if (hash(x + 1, y, z, seed + 51) < 0.55 && inWorld(x + 1, y, z)) {
              const neighbor = blocks[idx(x + 1, y, z)];
              if (neighbor === 2 || neighbor === 3) blocks[idx(x + 1, y, z)] = ore;
            }
          }
        }
        if (y > 1 && y < h - 2 && id !== 17) {
          const cave = hash(x, y, z, seed + 23);
          const cave2 = hash(x + 4, y, z - 3, seed + 29);
          if (cave < 0.46 && cave2 < 0.5) id = AIR;
        }
        if (id !== AIR) blocks[idx(x, y, z)] = id;
      }
    }
  }

  for (let i = 0; i < 22; i++) {
    const tx = 2 + Math.floor(hash(i, 1, 0, seed) * (WX - 4));
    const tz = 2 + Math.floor(hash(i, 2, 0, seed) * (WZ - 4));
    if (tx > 6 && tx < 16 && tz > 18 && tz < 30) continue;
    const h = surface[tx + tz * WX];
    if (blocks[idx(tx, h, tz)] !== 1 && dimension !== "ember") continue;
    if (dimension === "ember") {
      for (let y = 1; y <= 4; y++) set(blocks, tx, h + y, tz, y === 4 ? 22 : 7);
      continue;
    }
    if (dimension === "geode" || i % 2 === 0) {
      const top = h + 4;
      if (top >= WY) continue;
      for (let y = 1; y <= 3; y++) set(blocks, tx, h + y, tz, y === 3 ? 11 : 3);
      set(blocks, tx, h + 4, tz, 16);
      continue;
    }
    const top = h + 5;
    if (top >= WY) continue;
    for (let y = 1; y <= 4; y++) set(blocks, tx, h + y, tz, 13);
    for (let dy = 3; dy <= 5; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && hash(tx + dx, dy, tz + dz, seed) > 0.55) continue;
          const nx = tx + dx;
          const ny = h + dy;
          const nz = tz + dz;
          if (!inWorld(nx, ny, nz)) continue;
          if (blocks[idx(nx, ny, nz)] === AIR) blocks[idx(nx, ny, nz)] = 14;
        }
      }
    }
  }

  for (let z = 0; z < WZ; z++) {
    for (let x = 0; x < WX; x++) {
      const h = surface[x + z * WX];
      const shaft = Math.hypot(x - 24, z - 24) < 7;
      if (shaft) continue;
      for (let y = h + 9; y < WY; y++) {
        if (blocks[idx(x, y, z)] === AIR) blocks[idx(x, y, z)] = 3;
      }
    }
  }

  decorateDimension(blocks, surface, seed, dimension);

  const services = DIMENSIONS[dimension].services;
  const terminal = services ? stampTerminal(blocks, surface) : { x: 0, y: -20, z: 0 };
  const vault = services ? stampVault(blocks) : { x: 0, y: -20, z: 0 };
  carvePortalPads(blocks, dimension);
  const shaft = carveShaft(blocks, dimension, layoutSeed);
  const portals = portalSites(blocks, dimension);
  const generated = blocks.slice();
  const spawn = carveSpawn(blocks, generated);
  return { seed, dimension, services, generated, blocks, spawn, terminal, vault, portals, shaft };
}

function rollOre(dimension: DimensionId, depth: number, x: number, y: number, z: number, seed: number): number {
  const r = hash(x, y, z, seed + 7);
  if (dimension === "geode") {
    if (depth > 5 && r < 0.028) return 16;
    if (depth > 4 && r < 0.07) return 11;
    if (depth > 8 && r < 0.082) return 9;
    if (depth > 3 && r < 0.11) return 4;
    return 0;
  }
  if (dimension === "ember") {
    if (depth > 4 && r < 0.014) return 8;
    if (depth > 2 && r < 0.055) return 7;
    if (depth > 5 && r < 0.075) return 5;
    if (depth > 6 && r < 0.09) return 6;
    return 0;
  }
  if (depth > 3 && r < 0.045) return 4;
  if (depth > 5 && r < 0.03) return 5;
  if (depth > 6 && r < 0.022) return 6;
  if (depth > 8 && r < 0.012) return 7;
  if (depth > 9 && r < 0.008) return 8;
  if (depth > 11 && r < 0.004) return 9;
  if (depth > 12 && r < 0.003) return 10;
  if (depth > 7 && hash(x, y, z, seed + 11) < (z > 30 ? 0.02 : 0.008)) return 11;
  if (x > 32 && depth > 4 && hash(x, y, z, seed + 41) < 0.018) return 7;
  if (depth > 10 && hash(x, y, z, seed + 13) < 0.0035) return 12;
  if (depth > 13 && hash(x, y, z, seed + 17) < 0.004) return 16;
  return 0;
}

function decorateDimension(blocks: Uint8Array, surface: Int16Array, seed: number, dimension: DimensionId) {
  for (let i = 0; i < 4; i++) {
    const x = 6 + Math.floor(hash(i, 2, 9, seed) * (WX - 12));
    const z = 6 + Math.floor(hash(i, 3, 9, seed) * (WZ - 12));
    if (Math.hypot(x - 24, z - 24) < 8) continue;
    const h = surface[x + z * WX] ?? 10;
    const y = Math.max(3, h - 7);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          if ((dx * dx) / 9 + (dy * dy) / 4 + (dz * dz) / 9 > 1) continue;
          if (!inWorld(x + dx, y + dy, z + dz)) continue;
          const here = blocks[idx(x + dx, y + dy, z + dz)];
          if (here === 17 || here === 18 || here === 19) continue;
          set(blocks, x + dx, y + dy, z + dz, AIR);
        }
      }
    }
  }
  if (dimension === "geode") {
    for (let i = 0; i < 8; i++) {
      const x = 4 + Math.floor(hash(i, 9, 1, seed) * (WX - 8));
      const z = 4 + Math.floor(hash(i, 9, 2, seed) * (WZ - 8));
      const h = surface[x + z * WX] ?? 8;
      const y = Math.max(3, h - 5);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const dist = dx * dx + dy * dy + dz * dz;
            if (dist > 8 || !inWorld(x + dx, y + dy, z + dz)) continue;
            const here = blocks[idx(x + dx, y + dy, z + dz)];
            if (here === 17 || here === 18 || here === 19) continue;
            set(blocks, x + dx, y + dy, z + dz, dist <= 2 ? AIR : dist <= 5 ? 11 : 16);
          }
        }
      }
      if (inWorld(x + 1, y, z) && blocks[idx(x + 1, y, z)] !== 17) set(blocks, x + 1, y, z, 23);
    }
  }
  if (dimension === "ember") {
    for (let i = 0; i < 16; i++) {
      const x = 3 + Math.floor(hash(i, 4, 8, seed) * (WX - 6));
      const z = 3 + Math.floor(hash(i, 5, 8, seed) * (WZ - 6));
      if (Math.hypot(x - 24, z - 24) < 6) continue;
      const h = surface[x + z * WX] ?? 6;
      const y = Math.max(1, Math.min(h, 7));
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (!inWorld(x + dx, y, z + dz)) continue;
          const here = blocks[idx(x + dx, y, z + dz)];
          if (here === 17 || here === 18 || here === 19) continue;
          set(blocks, x + dx, y, z + dz, 22);
        }
      }
    }
  }
}

function carveShaft(blocks: Uint8Array, dimension: DimensionId, layoutSeed: number): { x: number; y: number; z: number } {
  const column = shaftColumn(layoutSeed);
  const floor = Math.max(2, Math.min(groundAt(blocks, column.x, column.z), 14));
  const rim = dimension === "ember" ? 7 : dimension === "geode" ? 16 : 11;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const x = column.x + dx;
      const z = column.z + dz;
      if (!inWorld(x, floor, z)) continue;
      for (let y = floor; y < Math.min(WY - 1, floor + 5); y++) {
        const here = blocks[idx(x, y, z)];
        if (here === 17 || here === 18 || here === 19) continue;
        set(blocks, x, y, z, AIR);
      }
      if (dx !== 0 || dz !== 0) set(blocks, x, floor - 1, z, rim);
      else if (blocks[idx(x, floor - 1, z)] !== 17) set(blocks, x, floor - 1, z, 2);
    }
  }
  return { x: column.x + 0.5, y: floor + 0.05, z: column.z + 0.5 };
}

function groundAt(blocks: Uint8Array, x: number, z: number): number {
  if (!inWorld(x, 1, z)) return 8;
  for (let y = WY - 4; y >= 1; y--) {
    const id = blocks[idx(x, y, z)];
    if (id !== AIR && id !== 13 && id !== 14) return y;
  }
  return 8;
}

export function portalSites(blocks: Uint8Array, dimension: DimensionId): PortalSite[] {
  return portalPlans(dimension, Math.floor(WX / 2)).map((plan) => {
    const baseY = Math.min(WY - 7, groundAt(blocks, plan.x, plan.z) + 1);
    return {
      to: plan.to,
      tint: plan.tint,
      anchorX: plan.x,
      anchorZ: plan.z,
      baseY,
      x: plan.x + 0.5,
      y: baseY + 1.4,
      z: plan.z + 0.5,
    };
  });
}

function carvePortalPads(blocks: Uint8Array, dimension: DimensionId) {
  for (const site of portalSites(blocks, dimension)) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 6; dz++) {
        const x = site.anchorX + dx;
        const z = site.anchorZ + dz;
        if (!inWorld(x, site.baseY, z)) continue;
        for (let dy = 0; dy <= 5; dy++) {
          const id = blocks[idx(x, site.baseY + dy, z)];
          if (id === 18 || id === 19) continue;
          set(blocks, x, site.baseY + dy, z, AIR);
        }
        const under = blocks[idx(x, site.baseY - 1, z)];
        if (under !== 17 && under !== 18 && under !== 19) set(blocks, x, site.baseY - 1, z, 2);
      }
    }
  }
}

function stampTerminal(blocks: Uint8Array, surface: Int16Array): { x: number; y: number; z: number } {
  const x0 = 9;
  const z0 = 22;
  let h = 0;
  for (let x = x0; x < x0 + 5; x++) {
    for (let z = z0; z < z0 + 5; z++) h = Math.max(h, surface[x + z * WX]);
  }
  for (let x = x0 - 1; x <= x0 + 5; x++) {
    for (let z = z0 - 1; z <= z0 + 5; z++) {
      for (let y = h + 1; y < Math.min(WY, h + 8); y++) set(blocks, x, y, z, AIR);
      if (inWorld(x, h, z) && blocks[idx(x, h, z)] !== 17) set(blocks, x, h, z, 3);
    }
  }
  for (let x = x0; x < x0 + 5; x++) {
    for (let z = z0; z < z0 + 5; z++) set(blocks, x, h, z, 16);
  }
  const pillars: Array<[number, number]> = [
    [x0, z0],
    [x0 + 4, z0],
    [x0, z0 + 4],
    [x0 + 4, z0 + 4],
  ];
  for (const [x, z] of pillars) {
    for (let y = 1; y <= 3; y++) set(blocks, x, h + y, z, 11);
  }
  set(blocks, x0 + 2, h + 1, z0 + 2, 18);
  set(blocks, x0 + 2, h + 2, z0 + 2, 18);
  set(blocks, x0 + 1, h + 1, z0 + 2, 5);
  set(blocks, x0 + 3, h + 1, z0 + 2, 5);
  return { x: x0 + 2.5, y: h + 1.2, z: z0 + 2.5 };
}

function stampVault(blocks: Uint8Array): { x: number; y: number; z: number } {
  const x0 = 36;
  const y0 = 6;
  const z0 = 8;
  for (let x = x0 - 3; x <= x0 + 3; x++) {
    for (let y = y0; y <= y0 + 5; y++) {
      for (let z = z0 - 3; z <= z0 + 3; z++) {
        const shell = x === x0 - 3 || x === x0 + 3 || z === z0 - 3 || z === z0 + 3 || y === y0 || y === y0 + 5;
        set(blocks, x, y, z, shell ? 3 : 0);
      }
    }
  }
  for (let x = x0 - 2; x <= x0 + 2; x++) {
    for (let z = z0 - 2; z <= z0 + 2; z++) set(blocks, x, y0, z, 16);
  }
  set(blocks, x0, y0 + 1, z0, 19);
  set(blocks, x0, y0 + 2, z0, 11);
  set(blocks, x0 - 2, y0 + 1, z0, 11);
  set(blocks, x0 + 2, y0 + 1, z0, 11);
  for (let y = y0 + 1; y <= y0 + 3; y++) {
    set(blocks, x0, y, z0 - 3, 0);
    set(blocks, x0, y, z0 - 4, 0);
    set(blocks, x0 - 1, y, z0 - 3, 0);
  }
  return { x: x0 + 0.5, y: y0 + 1.2, z: z0 + 0.5 };
}

function carveSpawn(blocks: Uint8Array, generated: Uint8Array): { x: number; y: number; z: number } {
  const x = 24;
  const z = 24;
  let top = 2;
  for (let y = WY - 1; y >= 1; y--) {
    if (blocks[idx(x, y, z)] !== AIR) {
      top = y;
      break;
    }
  }
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let y = top + 1; y <= top + 4; y++) set(blocks, x + dx, y, z + dz, AIR);
      const ground = blocks[idx(x + dx, top, z + dz)];
      if (ground === AIR || ground === 14 || ground === 13) set(blocks, x + dx, top, z + dz, 3);
    }
  }
  generated.set(blocks);
  return { x: x + 0.5, y: top + 1, z: z + 0.5 };
}

export type EditMap = Record<string, number>;

export function applyEdits(world: WorldData, edits: EditMap) {
  world.blocks.set(world.generated);
  for (const [key, id] of Object.entries(edits)) {
    const [xs, ys, zs] = key.split(",");
    const x = Number(xs);
    const y = Number(ys);
    const z = Number(zs);
    if (!inWorld(x, y, z)) continue;
    if (id < 0 || id >= BLOCKS.length) continue;
    world.blocks[idx(x, y, z)] = id;
  }
}

export function editKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}
