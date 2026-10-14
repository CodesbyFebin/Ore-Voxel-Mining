import assert from "node:assert/strict";
import test from "node:test";
import { dimensionSeed, portalPlans } from "./dimensions.ts";
import { generateWorld, idx } from "./world.ts";

const BASE = 0xe47e;

function count(blocks: Uint8Array, id: number) {
  let n = 0;
  for (const value of blocks) if (value === id) n += 1;
  return n;
}

test("dimension seeds match the v4.3 offsets and valley stays on the saved seed", () => {
  assert.equal(dimensionSeed(BASE, "valley"), BASE);
  assert.equal(dimensionSeed(BASE, "geode"), (BASE + 370019) >>> 0);
  assert.equal(dimensionSeed(BASE, "ember"), (BASE + 810037) >>> 0);
});

test("purple only links the valley and the abyss, orange only links the valley and the depths", () => {
  const valley = generateWorld(BASE, "valley");
  const geode = generateWorld(dimensionSeed(BASE, "geode"), "geode");
  const ember = generateWorld(dimensionSeed(BASE, "ember"), "ember");
  assert.deepEqual(valley.portals.map((gate) => [gate.to, gate.tint]), [
    ["geode", 0xaf65ff],
    ["ember", 0xff762f],
  ]);
  assert.deepEqual(geode.portals.map((gate) => [gate.to, gate.tint]), [["valley", 0xaf65ff]]);
  assert.deepEqual(ember.portals.map((gate) => [gate.to, gate.tint]), [["valley", 0xff762f]]);
  assert.deepEqual(
    valley.portals.map((gate) => [gate.anchorX, gate.anchorZ]),
    portalPlans("valley").map((plan) => [plan.x, plan.z]),
  );
  for (const world of [valley, geode, ember]) {
    assert.equal(count(world.blocks, 18) > 0, true);
    for (const gate of world.portals) {
      assert.equal(world.blocks[idx(gate.anchorX, gate.baseY, gate.anchorZ)], 0);
      assert.ok(Math.hypot(gate.x - 11.5, gate.z - 24.5) > 8);
    }
  }
});

test("block edits stay on the world they were written to", () => {
  const valley = generateWorld(BASE, "valley");
  const geode = generateWorld(dimensionSeed(BASE, "geode"), "geode");
  const before = valley.blocks[0];
  geode.blocks[0] = 4;
  assert.equal(valley.blocks[0], before);
});
