import { BLOCK_COUNT, BLOCKS } from "@/game/blocks";
import { CHUNK, WX, WY, WZ, idx, inWorld } from "@/game/world";

const TILE = 16;
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
    for (let i = 0; i < 18; i++) {
      const n = ((id * 131 + i * 17) * 1103515245 + 12345) >>> 0;
      const x = ox + (n % 14) + 1;
      const y = oy + ((n >>> 8) % 14) + 1;
      ctx.fillStyle = (n >>> 16) & 1 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)";
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = def.speck;
    const dots = id === 12 || id === 18 ? 6 : 4;
    for (let i = 0; i < dots; i++) {
      const n = ((id * 47 + i * 91) * 1664525 + 1013904223) >>> 0;
      ctx.fillRect(ox + 2 + (n % 11), oy + 2 + ((n >>> 6) % 11), 2, 2);
    }
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(ox, oy, TILE, 1);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(ox, oy + TILE - 1, TILE, 1);
  }
  atlas = canvas;
  return canvas;
}

const FACES = [
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]] },
] as const;

function solid(blocks: Uint8Array, x: number, y: number, z: number): boolean {
  if (!inWorld(x, y, z)) return false;
  return blocks[idx(x, y, z)] !== 0;
}

export function meshChunk(blocks: Uint8Array, cx: number, cz: number): {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  for (let y = 0; y < WY; y++) {
    for (let z = z0; z < z0 + CHUNK && z < WZ; z++) {
      for (let x = x0; x < x0 + CHUNK && x < WX; x++) {
        const id = blocks[idx(x, y, z)];
        if (id === 0) continue;
        const col = (id - 1) % ATLAS_COLS;
        const row = Math.floor((id - 1) / ATLAS_COLS);
        const pad = 0.6 / (ATLAS_COLS * TILE);
        const u0 = col / ATLAS_COLS + pad;
        const v0 = 1 - (row + 1) / ATLAS_ROWS + pad;
        const u1 = (col + 1) / ATLAS_COLS - pad;
        const v1 = 1 - row / ATLAS_ROWS - pad;
        for (const face of FACES) {
          const nx = x + face.n[0];
          const ny = y + face.n[1];
          const nz = z + face.n[2];
          if (solid(blocks, nx, ny, nz)) continue;
          const corners = face.c;
          const quad = [0, 1, 2, 0, 2, 3];
          const uv = [
            [u0, v0],
            [u1, v0],
            [u1, v1],
            [u0, v1],
          ];
          for (const k of quad) {
            const c = corners[k];
            positions.push(x + c[0], y + c[1], z + c[2]);
            normals.push(face.n[0], face.n[1], face.n[2]);
            uvs.push(uv[k][0], uv[k][1]);
          }
        }
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
  };
}
