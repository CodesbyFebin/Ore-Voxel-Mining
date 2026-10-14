import assert from "node:assert/strict";
import test from "node:test";
import { accountsMatch, deployGateReason, readMinerTiles, reconcileMinerTiles } from "./provenance.ts";

test("miner tiles are read at offset 64 and reconciled per tile", () => {
  const data = new Uint8Array(720);
  data[0] = 103;
  const view = new DataView(data.buffer);
  view.setBigUint64(64, 1_000_000n, true);
  view.setBigUint64(72, 2_000_000n, true);
  const before = readMinerTiles(data);
  assert.ok(before);
  const after = before.slice();
  after[1] = 3_000_000n;
  assert.equal(reconcileMinerTiles(before, after, [1], 1_000_000n), null);
  assert.match(reconcileMinerTiles(before, after, [0], 1_000_000n) ?? "", /tile 1/);
});

test("account lists must match and a nameless fixture cannot open the gate", () => {
  assert.equal(accountsMatch(["a", "b"], ["a", "b"]), null);
  assert.match(accountsMatch(["a"], ["a", "b"]) ?? "", /count/);
  assert.match(deployGateReason(null), /not proof/);
  assert.match(deployGateReason("5".repeat(88)), /does not sign/);
});
