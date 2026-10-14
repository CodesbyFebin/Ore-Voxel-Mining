import { Connection, PublicKey } from "@solana/web3.js";
import { decodeBoard, decodeMiner, decodeRound, decodeTreasury, formatOre } from "@/ore/codec";
import {
  BOARD_ADDRESS,
  ORE_MINT,
  RPC_URLS,
  TREASURY_ADDRESS,
  minerPda,
  roundPda,
} from "@/ore/program";

export type ChainSnapshot = {
  ok: boolean;
  reason: string;
  rpc: string | null;
  slot: number | null;
  roundId: number | null;
  startSlot: number | null;
  endSlot: number | null;
  slotsLeft: number | null;
  etaSec: number | null;
  motherlode: string | null;
  solPerOre: number | null;
  deployedSol: number[] | null;
  roundSettled: boolean | null;
  fetchedAt: number;
};

export type WalletBalances = {
  sol: number | null;
  ore: string | null;
  minerRound: number | null;
  claimableSol: number | null;
  claimableOre: string | null;
  minerFound: boolean;
  /** SOL on each tile for `minerRound`. Null when the miner account did not decode. */
  deployedSol: number[] | null;
  reason: string | null;
};

const EMPTY: ChainSnapshot = {
  ok: false,
  reason: "Not read yet",
  rpc: null,
  slot: null,
  roundId: null,
  startSlot: null,
  endSlot: null,
  slotsLeft: null,
  etaSec: null,
  motherlode: null,
  solPerOre: null,
  deployedSol: null,
  roundSettled: null,
  fetchedAt: 0,
};

function b64(data: string): Uint8Array {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type AccountInfo = { data: [string, string] } | null;

async function rpcCall(method: string, params: unknown[]): Promise<{ url: string; result: unknown }> {
  let last = "Every public RPC refused the request";
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
      if (json.error) {
        last = json.error.message ?? "RPC error";
        continue;
      }
      return { url, result: json.result };
    } catch (err) {
      last = err instanceof Error ? err.message : "network error";
    }
  }
  throw new Error(last);
}

export async function readChain(): Promise<ChainSnapshot> {
  const snap: ChainSnapshot = { ...EMPTY, fetchedAt: Date.now() };
  try {
    const boardRes = await rpcCall("getMultipleAccounts", [
      [BOARD_ADDRESS.toBase58(), TREASURY_ADDRESS.toBase58()],
      { encoding: "base64" },
    ]);
    const body = boardRes.result as {
      context?: { slot?: number };
      value: AccountInfo[];
    };
    const slot = body.context?.slot ?? null;
    const boardAcc = body.value[0];
    const treasuryAcc = body.value[1];
    if (!boardAcc) {
      snap.reason = "Board account missing";
      snap.rpc = boardRes.url;
      return snap;
    }
    const board = decodeBoard(b64(boardAcc.data[0]));
    if (!board) {
      snap.reason = "Board account did not match the published layout";
      snap.rpc = boardRes.url;
      return snap;
    }
    const treasury = treasuryAcc ? decodeTreasury(b64(treasuryAcc.data[0])) : null;
    const roundRes = await rpcCall("getAccountInfo", [
      roundPda(board.roundId).toBase58(),
      { encoding: "base64" },
    ]);
    const roundBody = roundRes.result as { value: AccountInfo };
    const round = roundBody.value ? decodeRound(b64(roundBody.value.data[0])) : null;
    const slotsLeft = slot === null ? null : Math.max(0, board.endSlot - slot);
    snap.ok = true;
    snap.reason = "";
    snap.rpc = boardRes.url;
    snap.slot = slot;
    snap.roundId = board.roundId;
    snap.startSlot = board.startSlot;
    snap.endSlot = board.endSlot;
    snap.slotsLeft = slotsLeft;
    snap.etaSec = slotsLeft === null ? null : Math.round(slotsLeft * 0.4);
    snap.motherlode = treasury ? formatOre(treasury.motherlodeRaw) : null;
    snap.solPerOre = board.productionLamports / 1e9;
    snap.deployedSol = round?.deployedSol ?? null;
    snap.roundSettled = round?.settled ?? null;
    if (!round) snap.reason = "Round account unreadable";
    return snap;
  } catch (err) {
    snap.reason = err instanceof Error ? err.message : "RPC failed";
    return snap;
  }
}

export function connection(): Connection {
  return new Connection(RPC_URLS[0], "confirmed");
}

export async function readWallet(address: string): Promise<WalletBalances> {
  const out: WalletBalances = {
    sol: null,
    ore: null,
    minerRound: null,
    claimableSol: null,
    claimableOre: null,
    minerFound: false,
    deployedSol: null,
    reason: null,
  };
  try {
    const owner = new PublicKey(address);
    const conn = connection();
    const lamports = await conn.getBalance(owner, "confirmed");
    out.sol = lamports / 1e9;
    const tokens = await conn.getParsedTokenAccountsByOwner(owner, { mint: ORE_MINT });
    let raw = 0n;
    for (const row of tokens.value) {
      const amt = row.account.data.parsed.info.tokenAmount.amount as string;
      raw += BigInt(amt);
    }
    out.ore = formatOre(raw);
    const minerInfo = await conn.getAccountInfo(minerPda(owner), "confirmed");
    if (minerInfo) {
      out.minerFound = true;
      const decoded = decodeMiner(new Uint8Array(minerInfo.data));
      if (decoded) {
        out.minerRound = decoded.roundId;
        out.deployedSol = decoded.deployedSol;
        out.claimableSol = decoded.rewardsSol;
        out.claimableOre = formatOre(decoded.rewardsOreRaw);
      } else {
        out.reason = "Miner account exists but its layout did not match — rewards hidden";
      }
    }
    return out;
  } catch (err) {
    out.reason = err instanceof Error ? err.message : "Balance read failed";
    return out;
  }
}
