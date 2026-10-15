import { PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";
import { connection } from "@/ore/chain";

export type WalletProvider = {
  connect: () => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string } | string>;
};

type Injected = WalletProvider & { isPhantom?: boolean; isSolflare?: boolean; isBackpack?: boolean };

export function detectWallet(): { name: string; provider: WalletProvider } | null {
  const w = window as Window & {
    solana?: Injected;
    solflare?: Injected;
    backpack?: Injected;
  };
  if (w.solana?.isPhantom) return { name: "Phantom", provider: w.solana };
  if (w.backpack?.isBackpack) return { name: "Backpack", provider: w.backpack };
  if (w.solflare?.isSolflare) return { name: "Solflare", provider: w.solflare };
  if (w.solana?.connect && typeof w.solana.signAndSendTransaction === "function") return { name: "Solana wallet", provider: w.solana };
  return null;
}

export type PreparedTx = {
  tx: Transaction;
  messageHex: string;
  blockhash: string;
  logs: string[];
};

async function messageHex(tx: Transaction): Promise<string> {
  const bytes = tx.serializeMessage();
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Simulates the exact transaction the wallet will be asked to sign. */
export async function prepareTransaction(payer: string, instruction: TransactionInstruction): Promise<PreparedTx> {
  const conn = connection();
  const owner = new PublicKey(payer);
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.feePayer = owner;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.add(instruction);
  const sim = await conn.simulateTransaction(tx);
  if (sim.value.err) {
    const tail = (sim.value.logs ?? []).slice(-6).join("\n");
    throw new Error(`Simulation rejected the transaction. Nothing was sent.\n${tail || JSON.stringify(sim.value.err)}`);
  }
  return {
    tx,
    messageHex: await messageHex(tx),
    blockhash,
    logs: sim.value.logs ?? [],
  };
}

export async function signAndConfirm(provider: WalletProvider, prepared: PreparedTx): Promise<{ signature: string; slot: number | null }> {
  if (!provider.signAndSendTransaction) throw new Error("This wallet cannot send transactions.");
  const signed = await provider.signAndSendTransaction(prepared.tx);
  const signature = typeof signed === "string" ? signed : signed.signature;
  const conn = connection();
  const status = await conn.confirmTransaction(
    {
      signature,
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.tx.lastValidBlockHeight ?? 0,
    },
    "confirmed",
  );
  if (status.value.err) {
    throw new Error(`Transaction landed but failed on-chain: ${JSON.stringify(status.value.err)}`);
  }
  const info = await conn.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  return { signature, slot: info?.slot ?? null };
}

function spendingDisabled(): never {
  throw new Error("Financial operations are disabled. No verified deploy fixture is pinned, so this build does not construct or sign a transaction.");
}

export function buildDeploy(_authority: string, _lamportsPerTile: bigint, _roundId: number, _mask: number): never {
  spendingDisabled();
}

export function buildCheckpoint(_authority: string, _roundId: number): never {
  spendingDisabled();
}

export function buildClaimSol(_authority: string): never {
  spendingDisabled();
}

export function buildClaimOre(_authority: string): never {
  spendingDisabled();
}


/** ORE v4 instruction format fixtures. Not proof of deployed-program identity. */
export const ORE_PROGRAM_ID = new PublicKey("mineRHF5r6S7HyD9SppBfVMXMavDkJsxwGesEvxZr2A");
export const ORE_MINT_ADDRESS = new PublicKey("oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

/** Intentional permanent release guard until pinned-validator qualifications pass. */
export const ALLOW_FINANCIAL_OPERATIONS = false as const;

type ClaimSolAccounts = { authority: PublicKey; boardAccount: PublicKey; minerAccount: PublicKey };
type ClaimOreAccounts = ClaimSolAccounts & {
  recipientTokenAccount: PublicKey;
  treasuryAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
  bpsToClaim: bigint;
};

/** Internal pure constructor allows independent fixture tests while public calls stay disabled. */
export function constructClaimSolForConformance(params: ClaimSolAccounts): TransactionInstruction {
  return {
    programId: ORE_PROGRAM_ID,
    data: Uint8Array.of(3),
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: params.boardAccount, isSigner: false, isWritable: false },
      { pubkey: params.minerAccount, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
  };
}

export function constructClaimOreForConformance(params: ClaimOreAccounts): TransactionInstruction {
  if (params.bpsToClaim < 1n || params.bpsToClaim > 10_000n) {
    throw new RangeError("bpsToClaim must be between 1 and 10,000");
  }
  const data = new Uint8Array(9);
  data[0] = 4;
  new DataView(data.buffer).setBigUint64(1, params.bpsToClaim, true);
  return {
    programId: ORE_PROGRAM_ID,
    data,
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: params.boardAccount, isSigner: false, isWritable: false },
      { pubkey: params.minerAccount, isSigner: false, isWritable: true },
      { pubkey: ORE_MINT_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: params.recipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: params.treasuryAccount, isSigner: false, isWritable: true },
      { pubkey: params.treasuryTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ORE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
  };
}

export function buildCanonicalClaimSolInstruction(params: ClaimSolAccounts): TransactionInstruction {
  spendingDisabled();
  return constructClaimSolForConformance(params);
}

export function buildCanonicalClaimOreInstruction(params: ClaimOreAccounts): TransactionInstruction {
  spendingDisabled();
  return constructClaimOreForConformance(params);
}
