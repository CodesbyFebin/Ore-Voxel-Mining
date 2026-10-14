import { Buffer } from "buffer";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  checkpointInstructionData,
  claimOreInstructionData,
  claimSolInstructionData,
  deployInstructionData,
} from "@/ore/codec";

/** Addresses copied from regolith-labs/ore `api/src` (master) and checked on mainnet.
 * The published program id is `oreV3…`. This build does not invent a second "v4" id.
 * Product copy may say ORE v4; the chain program is this deployment. */
export const ORE_PROGRAM_ID = new PublicKey("oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv");
export const ORE_MINT = new PublicKey("oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp");
export const BOARD_ADDRESS = new PublicKey("BrcSxdp1nXFzou1YyDnQJcPNBNHgoypZmTsyKBSLLXzi");
export const TREASURY_ADDRESS = new PublicKey("45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG");
export const CONFIG_ADDRESS = new PublicKey("9c9X7aDRAF41faiDs94ELjT19UrGnn72wBW9hPsS4Awy");
export const ENTROPY_PROGRAM_ID = new PublicKey("3jSkUuYBoJzQPMEzTvkDFXCZUBksPamrVhrnHR9igu2X");
/** `VAR_ADDRESS` in consts.rs. Owner on mainnet is the entropy program above. */
export const ENTROPY_VAR = new PublicKey("BWCaDY96Xe4WkFq1M7UiCCRcChsJ3p51L5KrGzhxgm2E");

export const RPC_URLS = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
] as const;

const text = new TextEncoder();

function u64(n: number): Uint8Array {
  const a = new Uint8Array(8);
  let v = BigInt(n);
  for (let i = 0; i < 8; i++) {
    a[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return a;
}

function seed(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes);
}

export function automationPda(authority: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([seed(text.encode("automation")), seed(authority.toBytes())], ORE_PROGRAM_ID)[0];
}

export function minerPda(authority: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([seed(text.encode("miner")), seed(authority.toBytes())], ORE_PROGRAM_ID)[0];
}

export function roundPda(roundId: number): PublicKey {
  return PublicKey.findProgramAddressSync([seed(text.encode("round")), seed(u64(roundId))], ORE_PROGRAM_ID)[0];
}

function ix(keys: TransactionInstruction["keys"], data: Uint8Array): TransactionInstruction {
  return new TransactionInstruction({ programId: ORE_PROGRAM_ID, keys, data: Buffer.from(data) });
}

/** Amount is lamports PER selected tile. Total debit is amount × tile count. */
export function deployIx(authority: PublicKey, lamportsPerTile: bigint, roundId: number, mask: number) {
  const data = deployInstructionData(lamportsPerTile, mask);
  return ix(
    [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: true },
      { pubkey: automationPda(authority), isSigner: false, isWritable: true },
      { pubkey: BOARD_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: CONFIG_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: minerPda(authority), isSigner: false, isWritable: true },
      { pubkey: roundPda(roundId), isSigner: false, isWritable: true },
      { pubkey: TREASURY_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ENTROPY_VAR, isSigner: false, isWritable: true },
      { pubkey: ENTROPY_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  );
}

export function checkpointIx(authority: PublicKey, roundId: number) {
  return ix(
    [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: true },
      { pubkey: automationPda(authority), isSigner: false, isWritable: true },
      { pubkey: BOARD_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: minerPda(authority), isSigner: false, isWritable: true },
      { pubkey: roundPda(roundId), isSigner: false, isWritable: true },
      { pubkey: TREASURY_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    checkpointInstructionData(),
  );
}

export function claimSolIx(authority: PublicKey) {
  return ix(
    [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: BOARD_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: minerPda(authority), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    claimSolInstructionData(),
  );
}

export function claimOreIx(authority: PublicKey, bps = 10_000n) {
  const treasuryTokens = getAssociatedTokenAddressSync(ORE_MINT, TREASURY_ADDRESS, true);
  const recipient = getAssociatedTokenAddressSync(ORE_MINT, authority, false);
  return ix(
    [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: BOARD_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: minerPda(authority), isSigner: false, isWritable: true },
      { pubkey: ORE_MINT, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: TREASURY_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: treasuryTokens, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    claimOreInstructionData(bps),
  );
}
