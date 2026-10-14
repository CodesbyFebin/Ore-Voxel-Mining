import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  acceptForSignature,
  approve,
  assertCanSpend,
  clearDeployFixture,
  encodeReviewed,
  gameCoinReceipt,
  judgeReceipt,
  parseSolInput,
  resetReceipts,
  reviewMessage,
  setDeployFixture,
  sha256Hex,
} from "./approval.mjs";

test("parseSolInput rejects amounts that are not a positive fixed-point string", () => {
  assert.equal(parseSolInput("0.01"), 10_000_000n);
  assert.equal(parseSolInput("1"), 1_000_000_000n);
  for (const bad of ["-1", "1e-3", "1.1234567890", "1.2.3", "", "0", "0.0", "abc", " 1"]) {
    assert.throws(() => parseSolInput(bad), Error, bad);
  }
});

test("a changed byte is not the approved message", async () => {
  const reviewed = approve(await reviewMessage(encodeReviewed("deploy-round-440594")));
  const presented = Uint8Array.from(reviewed.bytes);
  presented[0] ^= 0xff;
  assert.equal(presented.length, reviewed.bytes.length);
  setDeployFixture({ message: "pinned", accounts: ["authority"] });
  assert.throws(() => acceptForSignature(reviewed, presented), /different message/);
  clearDeployFixture();
});

test("spending stays closed until a fixture is pinned", async () => {
  clearDeployFixture();
  const reviewed = approve(await reviewMessage(encodeReviewed("deploy")));
  assert.throws(() => assertCanSpend(), /Awaiting a verified deploy fixture/);
  assert.throws(() => acceptForSignature(reviewed, reviewed.bytes), /Awaiting a verified deploy fixture/);
});

test("the exact approved bytes may be accepted only after a fixture is pinned", async () => {
  const reviewed = approve(await reviewMessage(encodeReviewed("deploy-exact")));
  setDeployFixture({ message: "known-good", accounts: ["authority", "board"] });
  const accepted = acceptForSignature(reviewed, reviewed.bytes);
  assert.equal(accepted.messageHash, reviewed.hash);
  assert.equal(accepted.byteLength, reviewed.bytes.length);
  clearDeployFixture();
});

test("a receipt is verified only when every check passes, and only once", async () => {
  resetReceipts();
  const hash = await sha256Hex(encodeReviewed("receipt-1"));
  const partial = await judgeReceipt({
    messageHash: hash,
    approved: true,
    exactMessage: true,
    signatureValid: true,
    instructionMatches: true,
    reconciled: false,
    finality: "confirmed",
  });
  assert.equal(partial.verified, false);
  assert.equal(partial.checks.find((check) => check.name === "reconcile")?.ok, false);

  const full = await judgeReceipt({
    messageHash: hash,
    approved: true,
    exactMessage: true,
    signatureValid: true,
    instructionMatches: true,
    reconciled: true,
    finality: "finalized",
  });
  assert.equal(full.verified, true);
  assert.equal(full.finality, "finalized");
  assert.equal(full.checks.every((check) => check.ok), true);

  const replay = await judgeReceipt({
    messageHash: hash,
    approved: true,
    exactMessage: true,
    signatureValid: true,
    instructionMatches: true,
    reconciled: true,
  });
  assert.equal(replay.verified, false);
  assert.equal(replay.checks.find((check) => check.name === "replay")?.ok, false);
});

test("a chain or metadata error blocks the verified flag", async () => {
  resetReceipts();
  const judged = await judgeReceipt({
    messageHash: "aa",
    approved: true,
    exactMessage: true,
    signatureValid: true,
    chainErr: "InstructionError",
    metaErr: null,
    instructionMatches: true,
    reconciled: true,
  });
  assert.equal(judged.verified, false);
});

test("miner coins are not a verified receipt", () => {
  const coin = gameCoinReceipt();
  assert.equal(coin.verified, false);
  assert.match(coin.reason, /not an ORE receipt/);
});

test("the Tamarin model still names the approval lemmas", () => {
  const theory = readFileSync(new URL("../tamarin/edgeore-approval.spthy", import.meta.url), "utf8");
  for (const name of [
    "no_sign_without_approval",
    "sign_requires_open_gate",
    "verified_requires_every_check",
    "no_double_receipt",
    "game_coin_is_not_a_receipt",
    "executable_honest",
  ]) {
    assert.match(theory, new RegExp(`lemma ${name}`));
  }
});
