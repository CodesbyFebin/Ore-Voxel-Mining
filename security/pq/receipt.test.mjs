import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign, verify as edVerify } from "node:crypto";
import test from "node:test";
import { canonicalReceipt, signReceiptBundle, verifyReceiptBundle } from "./receipt.mjs";

const receipt = {
  signature: "solana-signature-placeholder",
  messageHash: "ab".repeat(32),
  slot: 440594,
  finality: "confirmed",
};

test("an ML-DSA receipt verifies, and a flipped message does not", () => {
  const bundle = signReceiptBundle(receipt);
  assert.equal(bundle.valid, true);
  assert.equal(verifyReceiptBundle(bundle), true);
  const flipped = Uint8Array.from(bundle.message);
  flipped[0] ^= 0xff;
  assert.equal(verifyReceiptBundle(bundle, flipped), false);
  assert.ok(bundle.signatureBytes > 64);
  assert.ok(bundle.publicKeyBytes > 32);
});

test("the signed bytes are the canonical receipt, not a Solana transaction", () => {
  const message = canonicalReceipt(receipt);
  assert.match(new TextDecoder().decode(message), /solana-signature-placeholder/);
  assert.doesNotMatch(new TextDecoder().decode(message), /deploy/);
});

test("ML-DSA-44 signatures are larger than an Ed25519 signature of the same bytes", () => {
  const message = canonicalReceipt(receipt);
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const classical = edSign(null, message, privateKey);
  assert.equal(edVerify(null, message, publicKey, classical), true);
  const bundle = signReceiptBundle(receipt);
  assert.ok(bundle.signatureBytes > classical.length);
});
