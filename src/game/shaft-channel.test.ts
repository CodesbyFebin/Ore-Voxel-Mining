import assert from "node:assert/strict";
import test from "node:test";
import { canContinueShaftChannel, SHAFT_COOLDOWN_MS } from "./shaft-channel.ts";

const origin = { x: 12, z: 12 };
const pos = { x: 12.01, z: 12 };
const allowed = (overrides: Record<string, unknown> = {}) => {
  const args = { origin, position: pos, inRange: true, holding: true, hasItem: true, nowMs: 9000, readyAtMs: 0, ...overrides };
  return canContinueShaftChannel(args.origin as typeof origin, args.position as typeof pos, args.inRange as boolean, args.holding as boolean, args.hasItem as boolean, args.nowMs as number, args.readyAtMs as number);
};
test("channel continues only while stationary, holding, and near shaft", () => {
  assert.equal(allowed(), true);
  assert.equal(allowed({ position: { x: 12.3, z: 12 } }), false);
  assert.equal(allowed({ holding: false }), false);
  assert.equal(allowed({ inRange: false }), false);
  assert.equal(allowed({ hasItem: false }), false);
});
test("cooldown prevents immediate re-channel", () => {
  assert.equal(SHAFT_COOLDOWN_MS, 2000);
  assert.equal(allowed({ readyAtMs: 9001 }), false);
  assert.equal(allowed({ readyAtMs: 9000 }), true);
});
