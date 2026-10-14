import { connection } from "@/ore/chain";
import { BOARD_ADDRESS, ENTROPY_PROGRAM_ID, ENTROPY_VAR, ORE_PROGRAM_ID } from "@/ore/program";

export type GateCheck = { name: string; ok: boolean; reason?: string };

export type GateResult = {
  ok: boolean;
  checks: GateCheck[];
  reason: string | null;
};

/**
 * Fail closed, matching the v4.1-rc guard.
 * Live accounts can pass. Spending stays closed until a known-good
 * transaction pins the deploy, checkpoint, and claim byte layouts.
 * No fixture hash is stored in this build, so those checks stay failed.
 */
export async function checkProtocolGate(): Promise<GateResult> {
  const conn = connection();
  const checks: GateCheck[] = [];
  const pass = (name: string) => checks.push({ name, ok: true });
  const fail = (name: string, reason: string) => checks.push({ name, ok: false, reason });

  try {
    const info = await conn.getAccountInfo(ORE_PROGRAM_ID);
    if (info?.executable) pass("ORE program is executable");
    else fail("ORE program is executable", "ORE program account is missing or not executable");
  } catch (error) {
    fail("ORE program is executable", error instanceof Error ? error.message : "RPC failed");
  }

  try {
    const info = await conn.getAccountInfo(BOARD_ADDRESS);
    if (!info) fail("Board account", "Board account was not found");
    else if (!info.owner.equals(ORE_PROGRAM_ID)) fail("Board account", "Board is not owned by the ORE program");
    else pass("Board account");
  } catch (error) {
    fail("Board account", error instanceof Error ? error.message : "RPC failed");
  }

  try {
    const info = await conn.getAccountInfo(ENTROPY_PROGRAM_ID);
    if (info?.executable) pass("Entropy program is executable");
    else fail("Entropy program is executable", "Entropy program account is missing or not executable");
  } catch (error) {
    fail("Entropy program is executable", error instanceof Error ? error.message : "RPC failed");
  }

  try {
    const info = await conn.getAccountInfo(ENTROPY_VAR);
    if (!info) fail("Entropy var owner", "Pinned var account was not found");
    else if (!info.owner.equals(ENTROPY_PROGRAM_ID)) fail("Entropy var owner", "Var owner is not the entropy program");
    else pass("Entropy var owner");
  } catch (error) {
    fail("Entropy var owner", error instanceof Error ? error.message : "RPC failed");
  }

  fail("Deploy fixture validated", "Awaiting a verified deploy fixture. Spending stays off.");
  fail("Checkpoint fixture validated", "Checkpoint builder is disabled in this build.");
  fail("Claim fixture validated", "Claim builders are disabled in this build.");

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    checks,
    reason: ok ? null : "Financial operations disabled. Awaiting a verified deploy fixture.",
  };
}
