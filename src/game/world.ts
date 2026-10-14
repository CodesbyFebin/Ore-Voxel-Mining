import { AIR, BLOCKS } from "./blocks.ts";
import { type DimensionId, DIMENSIONS, portalPlans } from "./dimensions.ts";

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
};

function set(buf: Uint8Array, x: number, y: number, z: number, id: number) {
  if (inWorld(x, y, z)) buf[idx(x, y, z)] = id;
}

export function generateWorld(seed: number, dimension: DimensionId = "valley"): WorldData {
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
          const r = hash(x, y, z, seed + 7);
          if (depth > 3 && r < 0.045) id = 4;
          else if (depth > 5 && r < 0.03) id = 5;
          else if (depth > 6 && r < 0.022) id = 6;
          else if (depth > 8 && r < 0.012) id = 7;
          else if (depth > 9 && r < 0.008) id = 8;
          else if (depth > 11 && r < 0.004) id = 9;
          else if (depth > 12 && r < 0.003) id = 10;
          else if (depth > 7 && hash(x, y, z, seed + 11) < (z > 30 ? 0.02 : 0.008)) id = 11;
          else if (x > 32 && depth > 4 && hash(x, y, z, seed + 41) < 0.018) id = 7;
          else if (depth > 10 && hash(x, y, z, seed + 13) < 0.0035) id = 12;
          else if (depth > 13 && hash(x, y, z, seed + 17) < 0.004) id = 16;
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
    if (blocks[idx(tx, h, tz)] !== 1) continue;
    if (i % 2 === 0) {
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

  const services = DIMENSIONS[dimension].services;
  const terminal = services ? stampTerminal(blocks, surface) : { x: 0, y: -20, z: 0 };
  const vault = services ? stampVault(blocks) : { x: 0, y: -20, z: 0 };
  carvePortalPads(blocks, dimension);
  const portals = portalSites(blocks, dimension);
  const generated = blocks.slice();
  const spawn = carveSpawn(blocks, generated);
  return { seed, dimension, services, generated, blocks, spawn, terminal, vault, portals };
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
