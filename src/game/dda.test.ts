import assert from "node:assert/strict";
import test from "node:test";
import { traceVoxel } from "./dda.ts";

const size = { x: 16, y: 16, z: 16 };
const world = new Uint8Array(16 * 16 * 16);
const at = (x: number, y: number, z: number) => x + z * 16 + y * 16 * 16;
world[at(5, 5, 5)] = 2;

function blockAt(x: number, y: number, z: number) {
  return world[at(x, y, z)];
}

function expectHit(
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  expect: [number, number, number],
  normal: [number, number, number],
) {
  const hit = traceVoxel(origin, direction, 6, blockAt, size);
  assert.ok(hit);
  assert.deepEqual([hit.x, hit.y, hit.z], expect);
  assert.deepEqual([hit.faceNormal.x, hit.faceNormal.y, hit.faceNormal.z], normal);
}

test("dda hits from each axis and reports the entered face", () => {
  expectHit({ x: 3.5, y: 5.5, z: 5.5 }, { x: 1, y: 0, z: 0 }, [5, 5, 5], [-1, 0, 0]);
  expectHit({ x: 7.5, y: 5.5, z: 5.5 }, { x: -1, y: 0, z: 0 }, [5, 5, 5], [1, 0, 0]);
  expectHit({ x: 5.5, y: 7.5, z: 5.5 }, { x: 0, y: -1, z: 0 }, [5, 5, 5], [0, 1, 0]);
  expectHit({ x: 5.5, y: 5.5, z: 3.5 }, { x: 0, y: 0, z: 1 }, [5, 5, 5], [0, 0, -1]);
});

test("dda misses past the range, ignores a zero direction, and hits the cell it starts in", () => {
  assert.equal(traceVoxel({ x: 0.5, y: 5.5, z: 5.5 }, { x: 1, y: 0, z: 0 }, 3, blockAt, size), null);
  assert.equal(traceVoxel({ x: 0.5, y: 5.5, z: 5.5 }, { x: 0, y: 0, z: 0 }, 6, blockAt, size), null);
  assert.equal(traceVoxel({ x: 5.5, y: 5.5, z: 5.5 }, { x: 1, y: 0, z: 0 }, 6, blockAt, size)?.blockType, 2);
});
