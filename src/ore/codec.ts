/** Pure ORE account decoders. Layouts checked against regolith-labs/ore master
 * and a live mainnet board account (disc 105, 40 bytes). */

export const ORE_PROGRAM_ID_STR = "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv";
export const LAMPORTS_PER_ORE = 100_000_000_000n;

export type BoardView = {
  roundId: number;
  startSlot: number;
  endSlot: number;
  /** Lamports of SOL per 1.0 ORE, from the protocol EMA. */
  productionLamports: number;
};

export type RoundView = {
  id: number;
  /** SOL deployed on each of the 25 tiles. */
  deployedSol: number[];
  settled: boolean;
};

export type TreasuryView = {
  motherlodeRaw: bigint;
};

export type MinerView = {
  roundId: number;
  rewardsSol: number;
  rewardsOreRaw: bigint;
  refinedOreRaw: bigint;
};

function view(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function u64(v: DataView, offset: number): number {
  return Number(v.getBigUint64(offset, true));
}

export function decodeBoard(data: Uint8Array): BoardView | null {
  if (data.length < 40 || data[0] !== 105) return null;
  const v = view(data);
  const roundId = u64(v, 8);
  const startSlot = u64(v, 16);
  const endSlot = u64(v, 24);
  if (roundId <= 0 || endSlot < startSlot) return null;
  return { roundId, startSlot, endSlot, productionLamports: u64(v, 32) };
}

export function decodeTreasury(data: Uint8Array): TreasuryView | null {
  if (data.length < 16 || data[0] !== 104) return null;
  return { motherlodeRaw: view(data).getBigUint64(8, true) };
}

export function decodeRound(data: Uint8Array): RoundView | null {
  // disc(8) + id(8) + deployed[25]
  if (data.length < 8 + 8 + 25 * 8 || data[0] !== 109) return null;
  const v = view(data);
  const id = u64(v, 8);
  const deployedSol: number[] = [];
  for (let i = 0; i < 25; i++) {
    deployedSol.push(u64(v, 16 + i * 8) / 1e9);
  }
  let settled = false;
  const hashAt = 8 + 8 + 200 + 200 + 200;
  if (data.length >= hashAt + 32) {
    settled = data.subarray(hashAt, hashAt + 32).some((b) => b !== 0);
  }
  return { id, deployedSol, settled };
}

/** Returns null when the account is the wrong size or the fields look insane. */
export function decodeMiner(data: Uint8Array): MinerView | null {
  if (data.length < 712 || data[0] !== 103) return null;
  const v = view(data);
  const roundId = u64(v, 664);
  const rewardsLamports = v.getBigUint64(688, true);
  const refined = v.getBigUint64(696, true);
  const rewardsOre = v.getBigUint64(704, true);
  if (roundId > 20_000_000) return null;
  if (rewardsLamports > 100_000n * 1_000_000_000n) return null;
  if (rewardsOre > 1_000_000n * LAMPORTS_PER_ORE) return null;
  return {
    roundId,
    rewardsSol: Number(rewardsLamports) / 1e9,
    rewardsOreRaw: rewardsOre,
    refinedOreRaw: refined,
  };
}

export function formatOre(raw: bigint, digits = 4): string {
  const neg = raw < 0n;
  const v = neg ? -raw : raw;
  const whole = v / LAMPORTS_PER_ORE;
  const frac = (v % LAMPORTS_PER_ORE).toString().padStart(11, "0").slice(0, digits);
  return `${neg ? "-" : ""}${whole.toString()}.${frac}`;
}

export function solToLamports(sol: number): bigint {
  if (!Number.isFinite(sol) || sol <= 0) return 0n;
  return BigInt(Math.round(sol * 1e9));
}

export function tileMask(selected: readonly boolean[]): number {
  let mask = 0;
  for (let i = 0; i < 25; i++) if (selected[i]) mask |= 1 << i;
  return mask >>> 0;
}

export function countTiles(mask: number): number {
  let n = 0;
  for (let i = 0; i < 25; i++) if (mask & (1 << i)) n++;
  return n;
}

/** Live mainnet deploy payload: disc 6 + u64 le + u32 le. Confirmed on a real tx. */
export function deployInstructionData(lamportsPerTile: bigint, mask: number): Uint8Array {
  const data = new Uint8Array(13);
  const v = new DataView(data.buffer);
  data[0] = 6;
  v.setBigUint64(1, lamportsPerTile, true);
  v.setUint32(9, mask >>> 0, true);
  return data;
}

export function checkpointInstructionData(): Uint8Array {
  return Uint8Array.of(2);
}

export function claimSolInstructionData(): Uint8Array {
  return Uint8Array.of(3);
}

export function claimOreInstructionData(bps: bigint): Uint8Array {
  const data = new Uint8Array(9);
  data[0] = 4;
  new DataView(data.buffer).setBigUint64(1, bps, true);
  return data;
}

/** Known board account from mainnet, captured while building this app. */
export function codecSelfTest(): string | null {
  const raw = Uint8Array.from(atob("aQAAAAAAAADAuAYAAAAAACjwOxsAAAAAGPE7GwAAAACX9OsuAAAAAA=="), (c) =>
    c.charCodeAt(0),
  );
  const board = decodeBoard(raw);
  if (!board) return "board failed to decode";
  if (board.roundId !== 440512) return `round ${board.roundId}`;
  if (board.endSlot - board.startSlot !== 240) return "slot span";
  const mask = tileMask([true, false, true]);
  if (mask !== 0b101) return "mask";
  const data = deployInstructionData(64166n, 0x01ffffff);
  if (data.length !== 13 || data[0] !== 6) return "deploy data";
  if (new DataView(data.buffer).getBigUint64(1, true) !== 64166n) return "amount";
  return null;
}
