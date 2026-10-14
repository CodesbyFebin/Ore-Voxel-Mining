import assert from "node:assert/strict";
import test from "node:test";
import { tryForge } from "./forge.ts";
import { dimensionSeed } from "./dimensions.ts";
import { generateWorld } from "./world.ts";

const BASE = 0xe47e;

function count(blocks: Uint8Array, id: number) {
  let n = 0;
  for (const value of blocks) if (value === id) n += 1;
  return n;
}

test("forge spends the listed materials and never invents a balance", () => {
  const made = tryForge({ 11: 4, 4: 1 }, "prism");
  assert.equal(made.ok, true);
  if (made.ok) {
    assert.equal(made.counts[11], undefined);
    assert.equal(made.counts[9], 1);
    assert.equal(made.counts[4], 1);
  }
  const missing = tryForge({ 11: 3 }, "prism");
  assert.equal(missing.ok, false);
  const lantern = tryForge({ 13: 2, 4: 1, 11: 1 }, "lantern");
  assert.equal(lantern.ok, true);
  if (lantern.ok) assert.equal(lantern.counts[25], 1);
  const kit = tryForge({ 4: 3, 13: 1 }, "medkit");
  assert.equal(kit.ok, true);
  if (kit.ok) assert.equal(kit.counts[26], 1);
});

test("amethyst holds more geodes, ember holds the magma, valley keeps neither lake", () => {
  const valley = generateWorld(BASE, "valley");
  const geode = generateWorld(dimensionSeed(BASE, "geode"), "geode");
  const ember = generateWorld(dimensionSeed(BASE, "ember"), "ember");
  assert.ok(count(geode.blocks, 16) > count(valley.blocks, 16));
  assert.ok(count(ember.blocks, 22) > 20);
  assert.equal(count(valley.blocks, 22), 0);
  assert.equal(count(geode.blocks, 22), 0);
  assert.equal(count(valley.blocks, 23), 0);
  assert.ok(count(geode.blocks, 23) >= 4);
  assert.equal(count(ember.blocks, 23), 0);
  assert.equal(count(valley.blocks, 24) + count(valley.blocks, 25) + count(valley.blocks, 26), 0);
  assert.ok(count(ember.blocks, 7) > count(valley.blocks, 7));
});
