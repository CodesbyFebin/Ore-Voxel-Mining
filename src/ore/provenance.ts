/** Miner.deployed[25] begins at byte 64 in the published account:
 *  8 disc + 32 authority + 8 auto_return + 8 checkpoint_id + 8 checkpoint_fee.
 *  Round id is at 664. Offset 56 is not this layout and is not used. */
export const MINER_DEPLOYED_OFFSET = 64;
export const MINER_ROUND_OFFSET = 664;

export function readMinerTiles(data: Uint8Array): bigint[] | null {
  if (data.length < MINER_DEPLOYED_OFFSET + 25 * 8 || data[0] !== 103) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tiles: bigint[] = [];
  for (let i = 0; i < 25; i++) tiles.push(view.getBigUint64(MINER_DEPLOYED_OFFSET + i * 8, true));
  return tiles;
}

/** Compares this miner's own tiles. Round totals are shared and are not proof. */
export function reconcileMinerTiles(before: readonly bigint[], after: readonly bigint[], tiles: readonly number[], expected: bigint): string | null {
  if (before.length !== 25 || after.length !== 25) return "miner tile snapshot is incomplete";
  if (typeof expected !== "bigint" || expected <= 0n) return "expected amount must be a positive bigint";
  for (const tile of tiles) {
    if (tile < 0 || tile > 24) return "tile is outside the board";
    const delta = after[tile] - before[tile];
    if (delta !== expected) return `tile ${tile + 1} changed by ${delta}, expected ${expected}`;
  }
  return null;
}

export function accountsMatch(executed: readonly string[], reviewed: readonly string[]): string | null {
  if (executed.length !== reviewed.length) return `account count ${executed.length} != ${reviewed.length}`;
  for (let i = 0; i < reviewed.length; i++) {
    if (executed[i] !== reviewed[i]) return `account ${i} differs`;
  }
  return null;
}

/** A fixture without a finalized source signature is a claim, not proof. */
export function deployGateReason(sourceTxSignature?: string | null): string {
  if (!sourceTxSignature) return "No finalized source transaction is configured. A matching byte claim is not proof.";
  return "Spending stays off. This build does not sign even when a signature is named.";
}
