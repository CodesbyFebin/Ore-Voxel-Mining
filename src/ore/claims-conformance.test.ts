import assert from "node:assert/strict";
import test from "node:test";
import { Keypair, SystemProgram } from "@solana/web3.js";
import {
  ALLOW_FINANCIAL_OPERATIONS,
  ORE_PROGRAM_ID,
  ORE_MINT_ADDRESS,
  constructClaimSolForConformance,
  constructClaimOreForConformance,
  buildCanonicalClaimSolInstruction,
  buildCanonicalClaimOreInstruction,
} from "./tx.ts";

// These are structural regression tests against inspected processor account order.
// They do not attest to deployed bytecode or authorize transactions.
const key = () => Keypair.generate().publicKey;
const a = key(), board = key(), miner = key(), recipient = key(), treasury = key(), vault = key();
const sol = { authority: a, boardAccount: board, minerAccount: miner };
const ore = { ...sol, recipientTokenAccount: recipient, treasuryAccount: treasury, treasuryTokenAccount: vault, bpsToClaim: 5_000n };

test("release financial gates remain fail-closed", () => {
  assert.equal(ALLOW_FINANCIAL_OPERATIONS, false);
  assert.throws(() => buildCanonicalClaimSolInstruction(sol), /Financial operations are disabled/);
  assert.throws(() => buildCanonicalClaimOreInstruction(ore), /Financial operations are disabled/);
});

test("ClaimSOL processor order and one-byte payload", () => {
  const ix = constructClaimSolForConformance(sol);
  assert.deepEqual([...ix.data], [3]);
  assert.equal(ix.keys.length, 5);
  [a, board, miner, SystemProgram.programId, ORE_PROGRAM_ID].forEach((p, i) => {
    assert.ok(ix.keys[i].pubkey.equals(p), `ClaimSOL account ${i}`);
  });
  assert.equal(ix.keys[0].isSigner, true);
  assert.equal(ix.keys[2].isWritable, true);
});

test("ClaimORE processor order and little-endian bps", () => {
  const ix = constructClaimOreForConformance(ore);
  assert.equal(ix.data.length, 9);
  assert.equal(ix.data[0], 4);
  assert.equal(new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength).getBigUint64(1, true), 5_000n);
  assert.equal(ix.keys.length, 11);
  [a, board, miner, ORE_MINT_ADDRESS, recipient, treasury, vault, SystemProgram.programId, ix.keys[8].pubkey, ix.keys[9].pubkey, ORE_PROGRAM_ID].forEach((p, i) => {
    assert.ok(ix.keys[i].pubkey.equals(p), `ClaimORE account ${i}`);
  });
  assert.equal(ix.keys[0].isSigner, true);
  assert.equal(ix.keys[4].isWritable, true);
  assert.equal(ix.keys[5].isWritable, true);
  assert.equal(ix.keys[6].isWritable, true);
});

test("ClaimORE bps range", () => {
  for (const bps of [0n, -1n, 10_001n, (1n << 64n)]) {
    assert.throws(() => constructClaimOreForConformance({ ...ore, bpsToClaim: bps }), /bpsToClaim/);
  }
  assert.equal(constructClaimOreForConformance({ ...ore, bpsToClaim: 1n }).data.length, 9);
  assert.equal(constructClaimOreForConformance({ ...ore, bpsToClaim: 10_000n }).data.length, 9);
});
