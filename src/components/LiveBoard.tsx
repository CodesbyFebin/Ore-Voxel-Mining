import type { ChainSnapshot, WalletBalances } from "@/ore/chain";

export function clock(sec: number | null): string {
  if (sec === null) return "—";
  const safe = Math.max(0, sec);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function freshEta(chain: ChainSnapshot, now = Date.now()): number | null {
  if (chain.etaSec === null || !chain.fetchedAt) return chain.etaSec;
  return Math.max(0, chain.etaSec - Math.floor((now - chain.fetchedAt) / 1000));
}

export function youDeployed(balances: WalletBalances | null, roundId: number | null): string {
  if (!balances) return "wallet not connected";
  if (!balances.minerFound) return "no miner account";
  if (!balances.deployedSol || balances.minerRound === null) return "unread";
  const total = balances.deployedSol.reduce((sum, value) => sum + value, 0);
  if (roundId !== null && balances.minerRound === roundId) return `${total.toFixed(3)} SOL on this round`;
  return `${total.toFixed(3)} SOL on round #${balances.minerRound}`;
}

function trim(value: string): string {
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function LiveBoard({
  chain,
  you = "—",
  layout = "compact",
  tier = 1,
}: {
  chain: ChainSnapshot;
  you?: string;
  layout?: "compact" | "grid";
  tier?: 1 | 2 | 3;
}) {
  const tiles = chain.deployedSol;
  const total = tiles ? tiles.reduce((sum, value) => sum + value, 0) : null;
  const peak = tiles && tiles.some((value) => value > 0) ? Math.max(...tiles) : null;
  if (layout === "grid") {
    return (
      <div className="grid-mine">
        <aside className="grid-side">
          <div className="grid-brand">EdgeORE</div>
          <Stat k="Round" v={chain.roundId === null ? "Unavailable" : `#${chain.roundId}`} />
          <Stat k="Players" v="Unread" />
          <Stat k="Motherlode" v={chain.motherlode ? trim(chain.motherlode) : "Unavailable"} />
          <Stat k="Total deployed" v={total === null ? "Unavailable" : `${total.toFixed(3)} SOL`} />
          <Stat k="Time remaining" v={clock(chain.ok ? chain.etaSec : null)} />
        </aside>
        <div>
          <h3 className="grid-title">Grid mining</h3>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 25 }, (_, i) => {
              const amount = tiles ? tiles[i] : null;
              const hot = peak !== null && amount === peak && peak > 0;
              return (
                <div key={i} className={`grid-tile ${hot ? "peak" : ""}`}>
                  <span>{amount === null ? "—" : amount.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
          <p className="grid-choose">Choose nothing. This grid does not send SOL.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            You deployed {you}. The cyan tile, if any, only has the most SOL right now. It is not a bonus and not a winner.
            {tier >= 2 ? " Past winning tiles are not on the board account, so no hot-cold history is shown." : ""}
            {tier >= 3 ? " Motherlode is the live treasury figure above. Deploy is not simulated and not sent." : ""}
          </p>
        </div>
        <aside className="grid-side">
          <Stat k="Deploy amount" v="Off" />
          <div className="mt-2 grid grid-cols-3 gap-1">
            {["+0.01", "+0.1", "+1"].map((step) => (
              <button key={step} type="button" className="rounded border border-line px-1 py-2 font-mono text-[11px] text-muted" disabled>
                {step}
              </button>
            ))}
          </div>
          <button type="button" className="mt-2 w-full rounded-lg bg-cyan py-3 text-xs font-extrabold text-bg opacity-40" disabled>
            Deploy disabled
          </button>
          <div className="mt-3 space-y-1 text-[11px] text-muted">
            <p>Cyan outline — most SOL on this round. Not a reward.</p>
            <p>Plain tile — live SOL on that square.</p>
            <p>No bonus tiles. No higher-reward marks.</p>
          </div>
        </aside>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="Round" v={chain.roundId === null ? "Unavailable" : `#${chain.roundId}`} />
        <Stat k="Motherlode" v={chain.motherlode ? `${trim(chain.motherlode)} ORE` : "Unavailable"} />
        <Stat k="Time left" v={clock(chain.ok ? chain.etaSec : null)} />
        <Stat k="Total deployed" v={total === null ? "Unavailable" : `${total.toFixed(3)} SOL`} />
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 25 }, (_, i) => {
          const amount = tiles ? tiles[i] : null;
          const hot = peak !== null && amount === peak && peak > 0;
          return (
            <div key={i} className={`tile-btn ${hot ? "on" : ""}`}>
              <span className="block text-muted">#{i + 1}</span>
              {amount === null ? "—" : amount.toFixed(3)}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        You deployed {you}.{" "}
        {peak === null
          ? chain.reason || "Tile amounts appear when the round account is readable."
          : "The cyan tile holds the most SOL on this round right now. That is not a winner."}
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-line px-2 py-2 font-mono text-[12px]">
      <div className="text-[10px] tracking-widest text-muted uppercase">{k}</div>
      <div>{v}</div>
    </div>
  );
}
