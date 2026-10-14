import assert from "node:assert/strict";
import test from "node:test";
import { decodeBoard, decodeMiner, decodeTreasury } from "./codec.ts";

test("live board and treasury fixtures decode to the captured round", () => {
  const board = decodeBoard(Buffer.from("6900000000000000cfb9060000000000bb223d1b00000000ab233d1b0000000017ad3e2f00000000", "hex"));
  assert.ok(board);
  assert.equal(board.roundId, 440783);
  assert.equal(board.endSlot - board.startSlot, 240);
  const treasury = decodeTreasury(Buffer.from("680000000000000000c033c504010000", "hex"));
  assert.ok(treasury);
  assert.equal(treasury.motherlodeRaw, 1120000000000n);
});

test("miner tile deployments sit at the published offset", () => {
  const data = new Uint8Array(720);
  data[0] = 103;
  const view = new DataView(data.buffer);
  view.setBigUint64(64, 250_000_000n, true);
  view.setBigUint64(64 + 8, 750_000_000n, true);
  view.setBigUint64(664, 440783n, true);
  const miner = decodeMiner(data);
  assert.ok(miner);
  assert.equal(miner.roundId, 440783);
  assert.equal(miner.deployedSol[0], 0.25);
  assert.equal(miner.deployedSol[1], 0.75);
  assert.equal(miner.deployedSol[2], 0);
});
