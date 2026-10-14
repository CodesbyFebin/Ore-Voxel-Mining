import { signReceiptBundle } from "./receipt.mjs";

const bundle = signReceiptBundle({
  signature: "example",
  messageHash: "00".repeat(32),
  slot: 0,
  finality: "confirmed",
});

console.log(
  JSON.stringify(
    {
      algorithm: bundle.algorithm,
      publicKeyBytes: bundle.publicKeyBytes,
      signatureBytes: bundle.signatureBytes,
      signMs: Number(bundle.signMs.toFixed(2)),
      verifyMs: Number(bundle.verifyMs.toFixed(2)),
      valid: bundle.valid,
      note: "Off-chain receipt evidence only. Solana wallet signatures are unchanged. rustpq/pqcrypto is not a dependency.",
    },
    null,
    2,
  ),
);
