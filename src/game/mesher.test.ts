import assert from "node:assert/strict";
import test from "node:test";
import { meshChunk } from "./mesher.ts";
import { generateWorld, idx, WX, WY, WZ } from "./world.ts";

test("chunk meshes carry a shade for every vertex", () => {
  const world = generateWorld(7, "valley");
  const mesh = meshChunk(world.blocks, 1, 1);
  assert.ok(mesh.positions.length > 0);
  assert.equal(mesh.colors.length, mesh.positions.length);
  assert.equal(mesh.tiles.length / 4, mesh.positions.length / 3);
  assert.ok(mesh.colors[0] > 0.2 && mesh.colors[0] <= 1);
});

test("greedy meshing collapses a run to the same quad count as one block", () => {
  const one = new Uint8Array(WX * WY * WZ);
  one[idx(2, 3, 2)] = 3;
  const two = new Uint8Array(WX * WY * WZ);
  two[idx(2, 3, 2)] = 3;
  two[idx(3, 3, 2)] = 3;
  assert.equal(meshChunk(one, 0, 0).positions.length, meshChunk(two, 0, 0).positions.length);
});

test("a lone block keeps an outward top normal", () => {
  const blocks = new Uint8Array(WX * WY * WZ);
  blocks[idx(2, 3, 2)] = 3;
  const mesh = meshChunk(blocks, 0, 0);
  let top = 0;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    if (mesh.positions[i + 1] === 4 && mesh.normals[i + 1] === 1) top++;
  }
  assert.equal(top, 6);
});

test("a neighbor across the chunk border hides the shared face", () => {
  const blocks = new Uint8Array(WX * WY * WZ);
  blocks[idx(15, 3, 2)] = 3;
  blocks[idx(16, 3, 2)] = 3;
  assert.equal(meshChunk(blocks, 0, 0).positions.length, 5 * 6 * 3);
});
