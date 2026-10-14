/**
 * Off-chain ML-DSA receipt bundle.
 * Signs an exported receipt. Does not replace a Solana wallet signature
 * and is not imported by the game.
 *
 * Implementation: @noble/post-quantum (maintained). rustpq/pqcrypto is not used.
 */
import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";

const text = new TextEncoder();

export function canonicalReceipt(receipt) {
  return text.encode(
    JSON.stringify({
      signature: receipt.signature,
      messageHash: receipt.messageHash,
      slot: receipt.slot,
      finality: receipt.finality,
    }),
  );
}

export function signReceiptBundle(receipt) {
  const message = canonicalReceipt(receipt);
  const keys = ml_dsa44.keygen();
  const started = performance.now();
  const signature = ml_dsa44.sign(message, keys.secretKey);
  const signMs = performance.now() - started;
  const verifyStarted = performance.now();
  const valid = ml_dsa44.verify(signature, message, keys.publicKey);
  const verifyMs = performance.now() - verifyStarted;
  return {
    algorithm: "ML-DSA-44",
    publicKeyBytes: keys.publicKey.length,
    signatureBytes: signature.length,
    signMs,
    verifyMs,
    valid,
    publicKey: keys.publicKey,
    signature,
    message,
  };
}

export function verifyReceiptBundle(bundle, message = bundle.message) {
  return ml_dsa44.verify(bundle.signature, message, bundle.publicKey);
}
