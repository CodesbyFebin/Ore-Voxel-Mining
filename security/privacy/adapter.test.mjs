import assert from "node:assert/strict";
import test from "node:test";
import { classifyPrivacyRequest, PRIVACY_CONSTRAINTS } from "./adapter.mjs";

test("ORE deploy is refused and nothing is submitted", () => {
  const result = classifyPrivacyRequest({
    kind: "deploy",
    program: "ore",
    asset: "ORE",
    consent: true,
    wallets: ["one"],
  });
  assert.equal(result.accepted, false);
  assert.match(result.reason, /not routed through a privacy pool/);
  assert.equal(PRIVACY_CONSTRAINTS.submitsTransactions, false);
  assert.equal(PRIVACY_CONSTRAINTS.routesOreDeploy, false);
});

test("hardware wallets and missing consent are refused", () => {
  assert.match(classifyPrivacyRequest({ kind: "deposit", asset: "SOL", hardwareWallet: true, consent: true, wallets: ["a"] }).reason, /Hardware/);
  assert.match(classifyPrivacyRequest({ kind: "deposit", asset: "SOL", consent: false, wallets: ["a"] }).reason, /consent/);
  assert.match(classifyPrivacyRequest({ kind: "deposit", asset: "SOL", consent: true, wallets: ["a", "b"] }).reason, /single wallet/);
});

test("a consented SOL deposit is still not submitted", () => {
  const result = classifyPrivacyRequest({
    kind: "deposit",
    asset: "SOL",
    consent: true,
    wallets: ["seeker"],
  });
  assert.equal(result.accepted, false);
  assert.equal(result.wouldHaveBeen, "deposit");
  assert.match(result.reason, /Proof of concept only/);
});
