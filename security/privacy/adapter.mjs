/**
 * Isolated Privacy Cash policy adapter.
 * Not imported by the game or the ORE terminal.
 * It never builds, signs, or broadcasts a transaction.
 *
 * Constraints copied from the SDK's own warnings:
 * - key derivation assumes a wallet repeats the same signature for the same challenge
 * - designed for one wallet, not a hardware wallet
 * - ORE deploy uses the ORE program's own accounts and must not be wrapped in this pool
 */

export const PRIVACY_CONSTRAINTS = Object.freeze({
  assets: Object.freeze(["SOL"]),
  singleWallet: true,
  hardwareWallets: false,
  signatureMustBeDeterministic: true,
  routesOreDeploy: false,
  submitsTransactions: false,
});

export function classifyPrivacyRequest(request) {
  if (!request || typeof request !== "object") {
    return { accepted: false, reason: "Missing request." };
  }
  if (request.kind === "deploy" || request.program === "ore" || request.asset === "ORE") {
    return {
      accepted: false,
      reason: "ORE deploy is not routed through a privacy pool. The ORE program has its own accounts.",
    };
  }
  if (request.hardwareWallet) {
    return { accepted: false, reason: "Hardware wallets are outside this adapter. A non-repeating signature can make a deposit unrecoverable." };
  }
  if (request.wallets && request.wallets.length !== 1) {
    return { accepted: false, reason: "This adapter is specified for a single wallet." };
  }
  if (request.asset && !PRIVACY_CONSTRAINTS.assets.includes(request.asset)) {
    return { accepted: false, reason: `Asset ${request.asset} is not in the documented set.` };
  }
  if (request.consent !== true) {
    return { accepted: false, reason: "An explicit deposit or withdrawal consent is required." };
  }
  return {
    accepted: false,
    reason: "Proof of concept only. No deposit, withdrawal, or signature is submitted.",
    wouldHaveBeen: request.kind === "withdraw" ? "withdraw" : "deposit",
  };
}
