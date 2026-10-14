import assert from "node:assert/strict";
import test from "node:test";
import { tryForge } from "./forge.ts";
import { shaftColumn } from "./shaft.ts";
import { dimensionSeed } from "./dimensions.ts";
import { generateWorld } from "./world.ts";

test("the shaft keeps one column for every world of the same save", () => {
  const layout = 0xe47e;
  const valley = generateWorld(dimensionSeed(layout, "valley"), "valley", layout);
  const geode = generateWorld(dimensionSeed(layout, "geode"), "geode", layout);
  const ember = generateWorld(dimensionSeed(layout, "ember"), "ember", layout);
  const column = shaftColumn(layout);
  assert.equal(valley.shaft.x, column.x + 0.5);
  assert.equal(geode.shaft.x, valley.shaft.x);
  assert.equal(ember.shaft.z, valley.shaft.z);
  assert.equal(geode.shaft.z, valley.shaft.z);
});

test("descent keys are cheap and the climb costs the ember shard", () => {
  const key = tryForge({ 11: 2 }, "key");
  const core = tryForge({ 16: 3 }, "core");
  const shard = tryForge({ 7: 4, 8: 2 }, "shard");
  assert.equal(key.ok && core.ok && shard.ok, true);
  const broke = tryForge({ 7: 4 }, "shard");
  assert.equal(broke.ok, false);
});
