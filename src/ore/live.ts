import { createServerFn } from "@tanstack/react-start";
import type { ChainSnapshot } from "@/ore/chain";

/** Same-origin read so the preview can show the board when the browser cannot reach an RPC. */
export const fetchLiveBoard = createServerFn({ method: "POST" }).handler(async (): Promise<ChainSnapshot> => {
  const { readChain } = await import("./chain");
  return readChain();
});

export async function loadLiveBoard(): Promise<ChainSnapshot> {
  try {
    const snap = await fetchLiveBoard();
    if (snap && (snap.ok || snap.reason)) return snap;
  } catch {
    /* The browser can still ask a public RPC directly. */
  }
  const { readChain } = await import("./chain");
  return readChain();
}
