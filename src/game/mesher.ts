import { BLOCK_COUNT, BLOCKS } from "./blocks.ts";
import { CHUNK, WX, WY, WZ, idx, inWorld } from "./world.ts";

const TILE = 32;
const ATLAS_COLS = 8;
const ATLAS_ROWS = 4;

let atlas: HTMLCanvasElement | null = null;

export function blockAtlas(): HTMLCanvasElement {
  if (atlas) return atlas;
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = ATLAS_ROWS * TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  for (let id = 1; id < BLOCK_COUNT; id++) {
    const def = BLOCKS[id];
    const col = (id - 1) % ATLAS_COLS;
    const row = Math.floor((id - 1) / ATLAS_COLS);
    const ox = col * TILE;
    const oy = row * TILE;
    ctx.fillStyle = def.color;
    ctx.fillRect(ox, oy, TILE, TILE);
    for (let i = 0; i < 48; i++) {
      const n = ((id * 131 + i * 17) * 1103515245 + 12345) >>> 0;
      const x = ox + (n % (TILE - 4)) + 2;
      const y = oy + ((n >>> 8) % (TILE - 4)) + 2;
      ctx.fillStyle = (n >>> 16) & 1 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.28)";
      ctx.fillRect(x, y, (n >>> 4) & 1 ? 2 : 1, (n >>> 5) & 1 ? 2 : 1);
    }
    ctx.fillStyle = def.speck;
    const gems = id === 11 || id === 12 || id === 16 || id === 23 ? 5 : 3;
    for (let i = 0; i < gems; i++) {
      const n = ((id * 47 + i * 91) * 1664525 + 1013904223) >>> 0;
      const gx = ox + 6 + (n % (TILE - 14));
      const gy = oy + 6 + ((n >>> 6) % (TILE - 14));
      ctx.fillRect(gx, gy, 3, 3);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(gx, gy, 1, 1);
      ctx.fillStyle = def.speck;
    }
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(ox, oy, TILE, 2);
    ctx.fillRect(ox, oy, 2, TILE);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(ox, oy + TILE - 2, TILE, 2);
    ctx.fillRect(ox + TILE - 2, oy, 2, TILE);
  }
  atlas = canvas;
  return canvas;
}

function tileOf(id: number): [number, number, number, number] {
  const col = (id - 1) % ATLAS_COLS;
  const row = Math.floor((id - 1) / ATLAS_ROWS);
  const pad = 0.6 / (ATLAS_COLS * TILE);
  const u0 = col / ATLAS_COLS + pad;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + pad;
  const du = (col + 1) / ATLAS_COLS - pad - u0;
  const dv = 1 - row / ATLAS_ROWS - pad - v0;
  return [u0, v0, du, dv];
}

function blockAt(blocks: Uint8Array, x: number, y: number, z: number): number {
  if (!inWorld(x, y, z)) return 0;
  return blocks[idx(x, y, z)] || 0;
}

export function meshChunk(blocks: Uint8Array, cx: number, cz: number): {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  tiles: Float32Array;
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const tiles: number[] = [];
  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  const origin = [x0, 0, z0];
  const dims = [Math.min(CHUNK, WX - x0), WY, Math.min(CHUNK, WZ - z0)];

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const mask = new Int16Array(dims[u] * dims[v]);
    const cursor = [0, 0, 0];
    for (cursor[d] = -1; cursor[d] < dims[d]; ) {
      let n = 0;
      for (cursor[v] = 0; cursor[v] < dims[v]; cursor[v]++) {
        for (cursor[u] = 0; cursor[u] < dims[u]; cursor[u]++, n++) {
          const ax = origin[0] + cursor[0];
          const ay = origin[1] + cursor[1];
          const az = origin[2] + cursor[2];
          const a = blockAt(blocks, ax, ay, az);
          const b = blockAt(blocks, ax + (d === 0 ? 1 : 0), ay + (d === 1 ? 1 : 0), az + (d === 2 ? 1 : 0));
          mask[n] = a !== 0 && b === 0 ? a : b !== 0 && a === 0 ? -b : 0;
        }
      }
      cursor[d]++;
      n = 0;
      for (let j = 0; j < dims[v]; j++) {
        for (let i = 0; i < dims[u]; ) {
          const cell = mask[n];
          if (cell === 0) {
            i++;
            n++;
            continue;
          }
          let w = 1;
          while (i + w < dims[u] && mask[n + w] === cell) w++;
          let h = 1;
          outer: while (j + h < dims[v]) {
            for (let k = 0; k < w; k++) {
              if (mask[n + k + h * dims[u]] !== cell) break outer;
            }
            h++;
          }
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[n + x + y * dims[u]] = 0;
          pushQuad(cell, d, u, v, origin, cursor[d], i, j, w, h, positions, normals, uvs, colors, tiles);
          i += w;
          n += w;
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    tiles: new Float32Array(tiles),
  };
}

function pushQuad(
  cell: number,
  d: number,
  u: number,
  v: number,
  origin: number[],
  slice: number,
  i: number,
  j: number,
  w: number,
  h: number,
  positions: number[],
  normals: number[],
  uvs: number[],
  colors: number[],
  tiles: number[],
) {
  const positive = cell > 0;
  const id = Math.abs(cell);
  const p = [0, 0, 0];
  p[d] = origin[d] + slice;
  p[u] = origin[u] + i;
  p[v] = origin[v] + j;
  const du = [0, 0, 0];
  const dv = [0, 0, 0];
  du[u] = w;
  dv[v] = h;
  const corners = [
    p,
    [p[0] + du[0], p[1] + du[1], p[2] + du[2]],
    [p[0] + du[0] + dv[0], p[1] + du[1] + dv[1], p[2] + du[2] + dv[2]],
    [p[0] + dv[0], p[1] + dv[1], p[2] + dv[2]],
  ];
  const eps = 1e-4;
  const uv = [
    [0, 0],
    [w - eps, 0],
    [w - eps, h - eps],
    [0, h - eps],
  ];
  const order = positive ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  const normal = [0, 0, 0];
  normal[d] = positive ? 1 : -1;
  const shade = normal[1] === 1 ? 1 : normal[1] === -1 ? 0.48 : normal[0] !== 0 ? 0.74 : 0.62;
  const box = tileOf(id);
  for (const k of order) {
    const c = corners[k];
    positions.push(c[0], c[1], c[2]);
    normals.push(normal[0], normal[1], normal[2]);
    uvs.push(uv[k][0], uv[k][1]);
    colors.push(shade, shade, shade);
    tiles.push(box[0], box[1], box[2], box[3]);
  }
}
