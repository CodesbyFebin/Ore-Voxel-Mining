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
