/**
 * Executable model of the EdgeORE review and receipt policy.
 * This module is not imported by the voxel game or the ORE terminal.
 * It does not talk to Solana and it does not construct a transaction.
 */

const text = new TextEncoder();

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function parseSolInput(input) {
  if (typeof input !== "string" || !/^\d+(\.\d+)?$/.test(input)) {
    throw new Error("malformed SOL amount");
  }
  const [whole, frac = ""] = input.split(".");
  if (frac.length > 9) throw new Error("more than 9 decimal places");
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt((frac + "000000000").slice(0, 9));
  if (lamports <= 0n) throw new Error("amount must be greater than zero");
  return lamports;
}

let deployFixture = null;

export function setDeployFixture(fixture) {
  deployFixture = fixture;
}

export function clearDeployFixture() {
  deployFixture = null;
}

export function spendingAllowed() {
  return deployFixture !== null && typeof deployFixture.message === "string" && deployFixture.accounts?.length > 0;
}

export function assertCanSpend() {
  if (!spendingAllowed()) {
    throw new Error("Financial operations are disabled. Awaiting a verified deploy fixture.");
  }
}

export async function reviewMessage(bytes) {
  const copy = Uint8Array.from(bytes);
  return {
    bytes: copy,
    hash: await sha256Hex(copy),
    approved: false,
  };
}

export function approve(reviewed) {
  return { ...reviewed, bytes: Uint8Array.from(reviewed.bytes), approved: true };
}

export function presentedMatches(reviewed, presented) {
  if (!reviewed?.approved) return false;
  if (reviewed.bytes.length !== presented.length) return false;
  for (let i = 0; i < presented.length; i += 1) {
    if (reviewed.bytes[i] !== presented[i]) return false;
  }
  return true;
}

/** Refuses unless the presented bytes are the approved bytes. Never signs here. */
export function acceptForSignature(reviewed, presented) {
  assertCanSpend();
  if (!presentedMatches(reviewed, presented)) {
    throw new Error("Wallet was offered a different message than the one reviewed.");
  }
  return { messageHash: reviewed.hash, byteLength: presented.length };
}

const seen = new Set();

export function resetReceipts() {
  seen.clear();
}

/**
 * verified is true only when every check passes.
 * A repeated message hash is rejected as a replay.
 */
export async function judgeReceipt(input) {
  const checks = [];
  const fail = (name, reason) => checks.push({ name, ok: false, reason });
  const pass = (name) => checks.push({ name, ok: true });

  if (input.approved !== true) fail("approval", "No approval was recorded for this message.");
  else pass("approval");

  if (input.exactMessage !== true) fail("exact-message", "Signed bytes differ from the reviewed bytes.");
  else pass("exact-message");

  if (input.signatureValid !== true) fail("signature", "Signature did not verify over the reviewed message.");
  else pass("signature");

  if (input.chainErr) fail("chain", String(input.chainErr));
  else pass("chain");

  if (input.metaErr) fail("meta", String(input.metaErr));
  else pass("meta");

  if (input.instructionMatches !== true) fail("instruction", "On-chain instruction bytes do not match the review.");
  else pass("instruction");

  if (input.reconciled !== true) fail("reconcile", "Round deployed amounts were not reconciled.");
  else pass("reconcile");

  const hash = typeof input.messageHash === "string" ? input.messageHash : "";
  if (!hash) fail("hash", "Missing message hash.");
  else if (seen.has(hash)) fail("replay", "This message hash already has a receipt.");
  else pass("replay");

  const verified = checks.every((check) => check.ok);
  if (verified) seen.add(hash);
  return {
    verified,
    finality: input.finality === "finalized" ? "finalized" : "confirmed",
    checks,
  };
}

export function gameCoinReceipt() {
  return {
    kind: "game-coin",
    verified: false,
    reason: "Miner coins are not an ORE receipt.",
  };
}

export function encodeReviewed(message) {
  return text.encode(message);
}
