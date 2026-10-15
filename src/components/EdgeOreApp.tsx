import "@/polyfills";
import { useEffect, useRef, useState } from "react";
import { Landing } from "@/components/Landing";
import { LiveBoard, freshEta, youDeployed } from "@/components/LiveBoard";
import { Download, X } from "lucide-react";
import { SandboxMarket } from "@/components/SandboxMarket";
import { COMPUTE_STRUCTURES, blueprint, type ComputeStructure } from "@/game/compute-structures";
import { parseCraftBuildCommand, craftBlueprintSummary } from "@/game/craftgpt-ui";
import { PICKAXES, block } from "@/game/blocks";
import { FORGE } from "@/game/forge";
import type { GameHandle, HudSnapshot } from "@/game/engine";
import type { ChainSnapshot, WalletBalances } from "@/ore/chain";
import { ORE_PROGRAM_ID_STR } from "@/ore/codec";
import { terminalCapabilities, type TerminalDimension } from "@/ore/terminal-tiers";
import type { GateResult } from "@/ore/guard";
import type { PreparedTx, WalletProvider } from "@/ore/tx";

const RECEIPTS_KEY = "edgeore-chain-receipts-v1";

type Receipt = {
  version: 1;
  kind: string;
  network: "mainnet-beta";
  programId: string;
  wallet: string;
  signature: string;
  slot: number | null;
  roundId: number | null;
  lamportsPerTile: string | null;
  tiles: number;
  totalLamports: string | null;
  explorer: string;
  confirmedAt: number;
};

type Review = {
  title: string;
  kind: string;
  lines: { k: string; v: string }[];
  roundId: number | null;
  lamportsPerTile: bigint | null;
  mask: number;
  prepared: PreparedTx | null;
  error: string;
  busy: boolean;
};

const emptyChain = (): ChainSnapshot => ({
  ok: false,
  reason: "Reading mainnet…",
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
});

function loadReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    const data = raw ? (JSON.parse(raw) as Receipt[]) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function short(addr: string): string {
  return addr.length < 12 ? addr : `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function EdgeOreApp({ autostart = false }: { autostart?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const walletRef = useRef<WalletProvider | null>(null);
  const chainRef = useRef<ChainSnapshot>(emptyChain());
  const wantStart = useRef(autostart);
  const [started, setStarted] = useState(autostart);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [toast, setToast] = useState("");
  const [pack, setPack] = useState(false);
  const [term, setTerm] = useState(false);
  const [marketOpen,setMarketOpen] = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [chain, setChain] = useState<ChainSnapshot>(emptyChain);
  const [now, setNow] = useState(() => Date.now());
  const [walletName, setWalletName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [gate, setGate] = useState<GateResult | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [guide, setGuide] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [craftKind, setCraftKind] = useState<ComputeStructure>("embedding");
  const [craftCommand, setCraftCommand] = useState("");
  const [craftMessage, setCraftMessage] = useState("Choose a structure or enter a supported build command.");
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultCommit, setVaultCommit] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [packTab, setPackTab] = useState<"pack" | "craft" | "shop">("pack");
  const [termTab, setTermTab] = useState<"board" | "strategy" | "analytics">("board");
  const lookRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    chainRef.current = chain;
  }, [chain]);

  useEffect(() => {
    setReceipts(loadReceipts());
    setVaultCommit(localStorage.getItem("edgeore-vault-commit"));
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;
    setMobile(coarse);
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    let handle: GameHandle | null = null;
    void import("@/game/engine").then(({ mountGame }) => {
      if (dead || !canvasRef.current) return;
      handle = mountGame(canvasRef.current, {
        onHud: setHud,
        onToast: (msg) => {
          setToast(msg);
          window.setTimeout(() => setToast(""), 2400);
        },
      });
      gameRef.current = handle;
      if (wantStart.current) handle.start();
    });
    return () => {
      dead = true;
      handle?.dispose();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    let stop = false;
    let lastRound: number | null = null;
    const tick = async () => {
      try {
        const { loadLiveBoard } = await import("@/ore/live");
        const snap = await loadLiveBoard();
        if (stop) return;
        setChain(snap);
        if (snap.ok && snap.roundId !== null && lastRound !== null && snap.roundId !== lastRound) {
          setToast(`On-chain round advanced to #${snap.roundId}. That is not a win or a loss.`);
          window.setTimeout(() => setToast(""), 3200);
        }
        if (snap.roundId !== null) lastRound = snap.roundId;
      } catch (err) {
        if (stop) return;
        setChain((prev) => ({
          ...prev,
          ok: false,
          reason: err instanceof Error ? err.message : "Chain read failed",
          fetchedAt: Date.now(),
        }));
      }
    };
    void tick();
    const id = window.setInterval(() => {
      if (!document.hidden) void tick();
    }, 12000);
    const clockId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      window.clearInterval(id);
      window.clearInterval(clockId);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    let stop = false;
    void import("@/ore/guard").then(async (mod) => {
      const result = await mod.checkProtocolGate();
      if (!stop) setGate(result);
    });
    return () => {
      stop = true;
    };
  }, [started]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started) return;
      if (e.code === "KeyE" && !term) {
        e.preventDefault();
        setPack((v) => {
          const next = !v;
          gameRef.current?.setPaused(next || term);
          return next;
        });
      }
      if (e.code === "KeyF" && !term) {
        e.preventDefault();
        openTerminal();
      }
      if (e.code === "KeyP" && !term && !pack) {
        if (e.repeat) return;
        e.preventDefault();
        if (gameRef.current?.snapshot().shaft) return;
        enterPortalAndOpenGrid();
      }
      if (e.code === "KeyR") {
        e.preventDefault();
        openTerminal();
        setToast("Review is required. R does not send SOL.");
      }
      if (e.code === "Escape") {
        setPack(false);
        setTerm(false);
        setReview(null);
        gameRef.current?.setPaused(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, term]);

  /** Testing flow: world portal travel opens the informational ORE grid. */
  function enterPortalAndOpenGrid() {
    const game = gameRef.current;
    if (!game || term || pack || !game.snapshot().portal) {
      setToast("Walk into a glowing portal to open the ORE grid.");
      return;
    }
    game.usePortal();
    openTerminal();
    setToast("ORE grid is read-only. No SOL is spent and no ORE is mined.");
  }

  function openTerminal() {
    setMarketOpen(false);
    setTerm(true);
    setPack(false);
    gameRef.current?.setPaused(true);
    const snap = gameRef.current?.snapshot();
    if (snap) snap.quests;
    if (snap && !snap.quests.includes("terminal")) {
      /* quest is recorded when the player is near and opens — engine owns quests.
         Opening the UI is enough of a signal; the chain read is separate. */
    }
  }

  function closeOverlays() {
    setBuilderOpen(false);
    setMarketOpen(false);
    setPack(false);
    setTerm(false);
    setGuide(false);
    setVaultOpen(false);
    setReceiptsOpen(false);
    setReview(null);
    gameRef.current?.setPaused(false);
    if (started && !mobile) canvasRef.current?.requestPointerLock();
  }

  async function commitVault() {
    const here = gameRef.current?.snapshot();
    const payload = `edgeore-vault-local:${here?.x ?? 0}:${here?.z ?? 0}:${Date.now()}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem("edgeore-vault-commit", hex);
    setVaultCommit(hex);
    setToast("Commit saved in this browser. It is not an Entropy transaction.");
  }

  function revealVault() {
    if (!vaultCommit) {
      setToast("Commit locally first. This vault cannot reveal without that record.");
      return;
    }
    const msg = gameRef.current?.grantVault() ?? "";
    if (msg) setToast(msg);
  }

  async function connect() {
    const { detectWallet } = await import("@/ore/tx");
    const { readWallet } = await import("@/ore/chain");
    const found = detectWallet();
    if (!found) {
      setToast("No Solana wallet in this browser. Nothing was invented in its place.");
      return;
    }
    try {
      const res = await found.provider.connect();
      const addr = res.publicKey.toBase58();
      walletRef.current = found.provider;
      setWalletName(found.name);
      setAddress(addr);
      setBalances(await readWallet(addr));
      setToast(`${found.name} connected. Balances are a live read.`);
    } catch {
      setToast("Wallet connection was rejected. No transaction was sent.");
    }
  }

  async function refreshBalances() {
    if (!address) return;
    const { readWallet } = await import("@/ore/chain");
    setBalances(await readWallet(address));
  }

  async function confirmReview() {
    setReview(null);
    setToast("Financial operations are disabled. Nothing was signed or sent.");
  }

  function exportReceipts() {
    const blob = new Blob([JSON.stringify(receipts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edgeore-receipts.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const snap = hud;
  const near = Boolean(snap?.nearTerminal);
  const shownChain = { ...chain, etaSec: freshEta(chain, now) };
  const yours = youDeployed(balances, shownChain.roundId);
  const terminalView = terminalCapabilities((snap?.dimensionId === "ember" ? "ember" : snap?.dimensionId === "geode" ? "geode" : "valley") as TerminalDimension);

  return (
    <main className="shell">
      <canvas
        ref={canvasRef}
        id="game"
        onPointerDown={() => {
          if (started && !mobile) canvasRef.current?.requestPointerLock();
        }}
      />
      {started && <div className="cross" aria-hidden />}

      {started && snap && (
        <>
          <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-2">
            <div className="hud-card w-40">
              <div className="text-[10px] tracking-[0.16em] text-muted uppercase">Miner coins</div>
              <div className="font-mono text-lg text-gold">{snap.coins}</div>
              <div className="text-[10px] text-muted">Game only. Not SOL.</div>
              <div className="mt-2 flex gap-0.5" aria-label={`Health ${snap.health} of ${snap.healthMax}`}>
                {Array.from({ length: 10 }, (_, i) => {
                  const filled = snap.health / 2 - i;
                  const state = filled >= 1 ? "full" : filled > 0 ? "half" : "";
                  return <i key={i} className={`heart ${state}`} />;
                })}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted">
                Health {snap.health}/{snap.healthMax}
              </div>
              <div className="pointer-events-auto mt-2 grid grid-cols-2 gap-1 text-[10px] font-bold tracking-wider uppercase">
                {(["solo", "community", "pool", "bunker"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={snap.mode === mode ? "rounded border border-mint px-1 py-1 text-mint" : "rounded border border-line px-1 py-1 text-muted"}
                    onClick={() => gameRef.current?.setMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {snap.mode === "community" && <div className="mt-1 font-mono text-[10px] text-cyan">Crew chest {snap.crew} coins · this device</div>}
              {snap.mode === "pool" && <div className="mt-1 font-mono text-[10px] text-gold">Pool {snap.pool}/100 · lantern, not ORE</div>}
              {snap.mode === "bunker" && <div className="mt-1 font-mono text-[10px] text-muted">Bunker · darker, magma hits harder</div>}
              <div className="pointer-events-auto mt-2 flex gap-3">
                <button type="button" className="text-[10px] font-bold tracking-widest text-cyan uppercase" onClick={() => gameRef.current?.toggleView()}>
                  View
                </button>
                <button
                  type="button"
                  className="text-[10px] font-bold tracking-widest text-cyan uppercase"
                  onClick={() => {
                    setGuide(true);
                    gameRef.current?.setPaused(true);
                  }}
                >
                  Guide
                </button>
              </div>
              <button type="button" className="pointer-events-auto mt-2 text-[10px] font-bold tracking-widest text-mint uppercase" onClick={()=>{setBuilderOpen(true);gameRef.current?.setPaused(true);}}>Build Compute</button>
            </div>
            <div className="hud-card w-40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.16em] text-muted uppercase">Pick</span>
                <span className="font-mono text-[10px] text-muted">
                  {snap.durability}/{snap.durabilityMax}
                </span>
              </div>
              <div className="font-mono text-sm" style={{ color: snap.pickColor }}>
                {snap.pickName}
              </div>
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <i
                    key={i}
                    className={`h-1.5 flex-1 rounded-sm ${i < Math.round((snap.durability / Math.max(1, snap.durabilityMax)) * 10) ? "bg-mint" : "bg-line"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 text-center">
            <div className={`font-mono text-3xl leading-none ${chain.slotsLeft !== null && chain.slotsLeft < 30 ? "text-danger" : "text-mint"}`}>
              {chain.ok && chain.etaSec !== null ? (
                <>
                  {chain.etaSec}
                  <span className="text-sm">s</span>
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-cyan uppercase">
              {chain.roundId === null ? "Round unread" : `Round #${chain.roundId}`}
            </div>
          </div>

          <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
            <div className="hud-card flex items-center gap-3">
              <div>
                <div className="font-mono text-[11px]">
                  X {Math.floor(snap.x)} · Y {Math.floor(snap.y)} · Z {Math.floor(snap.z)}
                </div>
                <div className="text-[10px] font-bold tracking-[0.14em] text-cyan uppercase">{snap.dimension}</div>
                <div className="text-[10px] text-muted">Biome {biomeAt(snap.dimension, snap.x, snap.y, snap.z)}</div>
                <div className="font-mono text-[10px] text-muted">Depth {Math.max(0, 18 - Math.floor(snap.y))}</div>
              </div>
                <div className="relative grid size-12 place-items-center rounded-full border border-cyan/50">
                  <span className="absolute top-0.5 text-[8px] text-mint">N</span>
                  <div className="absolute size-10" style={{ transform: `rotate(${-snap.bearing}rad)` }}>
                    <span className="absolute top-0 left-1/2 h-4 w-1 -translate-x-1/2 rounded-full bg-mint" />
                  </div>
                </div>
            </div>
            {snap.aim && (
              <div className="hud-card w-52">
                <div className="text-[10px] tracking-[0.16em] text-cyan uppercase">{snap.aim.name}</div>
                <div className="mt-1 font-mono text-[11px] text-muted">Hardness {snap.aim.hardness}</div>
                <div className="font-mono text-[11px] text-copper">{snap.aim.need}</div>
                {snap.mine > 0 && (
                  <>
                    <div className="mt-1 font-mono text-[11px] text-mint">Mining {Math.round(snap.mine * 100)}%</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-mint" style={{ width: `${snap.mine * 100}%` }} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="hotbar pointer-events-auto absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {snap.hotbar.map((id, i) => (
              <button
                key={i}
                type="button"
                onClick={() => gameRef.current?.selectSlot(i)}
                className={`relative flex h-14 w-14 items-center justify-center rounded-md border ${i === snap.selected ? "border-mint bg-surface" : "border-line bg-bg/80"}`}
              >
                <span className="absolute top-0.5 left-1 font-mono text-[9px] text-muted">{i + 1}</span>
                {id > 0 && <i className="swatch" style={{ background: block(id).color }} />}
                {id > 0 && <span className="absolute right-1 bottom-0.5 font-mono text-[11px]">{snap.counts[id] ?? 0}</span>}
              </button>
            ))}
          </div>

          {snap.shaft && (
            <div className="pointer-events-none absolute top-[46%] left-1/2 z-10 w-52 -translate-x-1/2 text-center">
              <div className="rounded-full border border-cyan bg-bg/90 px-3 py-2 text-[11px] font-bold tracking-wide text-cyan">
                Hold P to {snap.shaft.verb} · {snap.shaft.item}
                {snap.shaft.ready ? "" : " · missing"}
              </div>
              <div className="mx-auto mt-1 h-1.5 w-40 overflow-hidden rounded bg-line">
                <div className="h-full bg-cyan" style={{ width: `${snap.shaft.progress * 100}%` }} />
              </div>
            </div>
          )}
          {snap.portal && !term && !pack && !snap.shaft && (
            <button
              type="button"
              onClick={enterPortalAndOpenGrid}
              className="absolute top-[54%] left-1/2 z-10 -translate-x-1/2 rounded-full border bg-bg/90 px-4 py-2 text-xs font-bold tracking-widest"
              style={{ borderColor: snap.portal.color, color: snap.portal.color }}
            >
              [P] ENTER {snap.portal.toName} + ORE GRID
            </button>
          )}
          {near && !term && (
            <button
              type="button"
              onClick={openTerminal}
              className="absolute top-[62%] left-1/2 z-10 -translate-x-1/2 rounded-full border border-mint bg-bg/90 px-4 py-2 text-xs font-bold tracking-widest text-mint"
            >
              USE TERMINAL
            </button>
          )}
          {snap.nearVault && !vaultOpen && !term && (
            <button
              type="button"
              onClick={() => {
                setVaultOpen(true);
                gameRef.current?.setPaused(true);
              }}
              className="absolute top-[70%] left-1/2 z-10 -translate-x-1/2 rounded-full border border-cyan bg-bg/90 px-4 py-2 text-xs font-bold tracking-widest text-cyan"
            >
              OPEN ENTROPY VAULT
            </button>
          )}
          <p className="pointer-events-none absolute bottom-20 left-3 z-10 hidden font-mono text-[10px] text-muted sm:block">
            WASD move · Shift sprint · V view · Q medkit · hold click mine · right click place · E pack · F terminal · P portal
          </p>
          <div className="pointer-events-none absolute bottom-20 left-3 z-10 font-mono text-[10px] text-cyan sm:bottom-16">
            Terminal {snap.terminalDist.toFixed(0)}m · motherlode {shownChain.motherlode ?? "unread"}
          </div>
        </>
      )}

      {toast && (
        <div className="absolute top-24 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-lg border border-mint bg-bg/95 px-4 py-2 text-center text-sm">
          {toast}
        </div>
      )}

      {!started && (
        <Landing
          onLaunch={() => {
            wantStart.current = true;
            setStarted(true);
            gameRef.current?.start();
          }}
        />
      )}

      {mobile && started && !pack && !term && !review && (
        <div className="absolute inset-0 z-20">
          <div
            className="absolute top-0 right-0 h-[70%] w-[55%]"
            onPointerDown={(e) => {
              lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              const look = lookRef.current;
              if (!look || look.id !== e.pointerId) return;
              gameRef.current?.setTouch({
                joyX: 0,
                joyY: 0,
                lookDx: e.clientX - look.x,
                lookDy: e.clientY - look.y,
              });
              look.x = e.clientX;
              look.y = e.clientY;
            }}
            onPointerUp={() => {
              lookRef.current = null;
            }}
          />
          <Joystick
            onChange={(joyX, joyY) => gameRef.current?.setTouch({ joyX, joyY, lookDx: 0, lookDy: 0 })}
          />
          <div className="absolute right-4 bottom-6 flex flex-col items-end gap-3">
            <button
              type="button"
              className="touch-btn"
              onPointerDown={() => gameRef.current?.setChannel(true)}
              onPointerUp={() => {
                const onShaft = Boolean(gameRef.current?.snapshot().shaft);
                gameRef.current?.setChannel(false);
                if (!onShaft) openTerminal();
              }}
              onPointerLeave={() => gameRef.current?.setChannel(false)}
            >
              PORTAL
            </button>
            <button type="button" className="touch-btn" onClick={openTerminal}>
              ORE
            </button>
            <button type="button" className="touch-btn" onClick={() => { setPack(true); gameRef.current?.setPaused(true); }}>
              PACK
            </button>
            <button
              type="button"
              className="touch-btn"
              onPointerDown={() => gameRef.current?.setJump(true)}
              onPointerUp={() => gameRef.current?.setJump(false)}
              onPointerLeave={() => gameRef.current?.setJump(false)}
            >
              JUMP
            </button>
            <button type="button" className="touch-btn" onClick={() => gameRef.current?.useItem()}>
              USE
            </button>
            <button type="button" className="touch-btn" onClick={() => gameRef.current?.place()}>
              PLACE
            </button>
            <button
              type="button"
              className="touch-btn mine"
              onPointerDown={() => gameRef.current?.setMining(true)}
              onPointerUp={() => gameRef.current?.setMining(false)}
              onPointerLeave={() => gameRef.current?.setMining(false)}
            >
              MINE
            </button>
          </div>
        </div>
      )}

      {pack && snap && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/70 p-3">
          <div className="sheet w-full max-w-lg p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Pack</h2>
              <button type="button" aria-label="Close pack" onClick={closeOverlays}>
                <X />
              </button>
            </header>
            <div className="mb-3 flex gap-2">
              {(["pack", "craft", "shop"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPackTab(tab)}
                  className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${packTab === tab ? "bg-mint text-bg" : "border border-line text-muted"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {packTab === "pack" && (
              <div className="space-y-2">
                {Object.keys(snap.counts).length === 0 && <p className="text-sm text-muted">Empty. Mine rock and timber.</p>}
                {Object.entries(snap.counts).map(([id, count]) => {
                  const def = block(Number(id));
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                      <i className="swatch" style={{ background: def.color }} />
                      <div className="flex-1">
                        <div className="text-sm font-bold">{def.name}</div>
                        <div className="font-mono text-[11px] text-muted">× {count}</div>
                      </div>
                      <button
                        type="button"
                        disabled={!def.coins}
                        className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-bg disabled:opacity-40"
                        onClick={() => gameRef.current?.sell(def.id)}
                      >
                        {def.coins ? `Sell ${def.coins * count}` : "No value"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {packTab === "craft" && (
              <div className="space-y-3 text-sm">
                <p className="text-muted">Miner coins buy later picks. Rock crafts the first upgrade.</p>
                <button type="button" className="w-full rounded-lg border border-line px-3 py-3 text-left" onClick={() => setToast(gameRef.current?.craftStone() || "Crafted.")}>
                  <b>Stone pick</b>
                  <span className="mt-1 block text-muted">24 rock, only while you still hold wood.</span>
                </button>
                <button type="button" className="w-full rounded-lg border border-line px-3 py-3 text-left" onClick={() => setToast(gameRef.current?.repair() || "Repaired.")}>
                  <b>Repair pick</b>
                  <span className="mt-1 block text-muted">8 timber. Restores durability. Not a token.</span>
                </button>
                {FORGE.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className="w-full rounded-lg border border-line px-3 py-3 text-left"
                    onClick={() => setToast(gameRef.current?.forge(recipe.id) || "Forged.")}
                  >
                    <b>{recipe.name}</b>
                    <span className="mt-1 block text-muted">{recipe.detail}</span>
                  </button>
                ))}
              </div>
            )}
            {packTab === "shop" && (
              <div className="space-y-2">
                {PICKAXES.map((pick, level) => (
                  <div key={pick.name} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden>
                      <rect x="14" y="14" width="4" height="16" fill="#6b3f22" />
                      <rect x="13" y="22" width="6" height="5" fill="#3a2416" />
                      <rect x="4" y="8" width="24" height="5" fill="#b7bdc7" />
                      <rect x="3" y="7" width="4" height="7" fill="#c47a45" />
                      <rect x="25" y="7" width="4" height="7" fill="#c47a45" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{pick.name}</div>
                      <div className="font-mono text-[11px] text-muted">×{pick.speed} speed · {pick.durability} uses</div>
                    </div>
                    {level <= snap.pickLevel ? (
                      <span className="text-xs text-mint">Owned</span>
                    ) : (
                      <button
                        type="button"
                        disabled={level !== snap.pickLevel + 1 || snap.coins < pick.cost}
                        className="rounded-md bg-copper px-3 py-2 text-xs font-bold text-bg disabled:opacity-40"
                        onClick={() => {
                          const msg = gameRef.current?.buyPick(level) ?? "";
                          if (msg) setToast(msg);
                        }}
                      >
                        {pick.cost} coins
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {builderOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/85 p-3 backdrop-blur-sm">
          <section className="sheet max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-cyan/40 p-5" role="dialog" aria-modal="true" aria-label="CraftGPT voxel blueprint builder">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs uppercase tracking-widest text-cyan">EdgeORE · Local Builder</p><h2 className="text-xl font-extrabold text-mint">CRAFTGPT STUDIO</h2></div>
              <button type="button" className="rounded border border-line px-3 py-2" onClick={closeOverlays}>Close</button>
            </div>
            <p className="mt-2 text-sm text-muted">Deterministic CraftGPT-inspired voxel exhibits. This is a local schematic planner, not neural inference. No wallet or blockchain transaction is used.</p>
            <label htmlFor="craft-command" className="mt-4 block text-xs font-bold uppercase tracking-wider text-cyan">Build command</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input id="craft-command" value={craftCommand} onChange={e=>setCraftCommand(e.target.value)} placeholder="build attention hall" maxLength={100} className="min-w-0 flex-1 rounded-lg border border-cyan/30 bg-surface px-3 py-3 font-mono text-sm text-white" />
              <button type="button" className="rounded-lg border border-cyan px-4 py-2 text-sm font-bold text-cyan" onClick={()=>{
                const parsed = parseCraftBuildCommand(craftCommand);
                if (!parsed.ok) { setCraftMessage(parsed.reason); return; }
                setCraftKind(parsed.kind);
                setCraftMessage(`Selected ${COMPUTE_STRUCTURES[parsed.kind].label}. Review the blueprint before building.`);
              }}>Plan</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.entries(COMPUTE_STRUCTURES) as Array<[ComputeStructure, (typeof COMPUTE_STRUCTURES)[ComputeStructure]]>).map(([kind, def]) => (
                <button type="button" key={kind} aria-pressed={craftKind===kind} className={`rounded-lg border p-3 text-left ${craftKind===kind?"border-mint bg-mint/10":"border-line bg-surface hover:border-cyan"}`} onClick={()=>{setCraftKind(kind);setCraftMessage(`Selected ${def.label}.`);}}>
                  <strong className="block text-xs text-cyan">{def.label}</strong><span className="mt-1 block text-[11px] text-muted">{def.description}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-line bg-surface p-3">
              <div className="flex flex-wrap justify-between gap-2 text-xs"><strong className="text-mint">{COMPUTE_STRUCTURES[craftKind].label} · Top-down footprint</strong><span className="text-muted">{craftBlueprintSummary(craftKind).total} blocks · 11×11 base · 5 levels max</span></div>
              <pre aria-label="Blueprint overhead preview" className="mt-3 overflow-x-auto whitespace-pre font-mono text-[11px] leading-4 text-cyan">{craftBlueprintSummary(craftKind).preview}</pre>
              <p className="mt-2 text-xs text-muted">Palette: {craftBlueprintSummary(craftKind).materials}. Placement uses the current dimension, a clear interior area, and protected-zone checks.</p>
            </div>
            <p role="status" aria-live="polite" className="mt-3 text-xs text-muted">{craftMessage}</p>
            <button type="button" className="mt-3 w-full rounded-lg border border-mint bg-mint/10 px-4 py-3 font-bold text-mint" onClick={()=>{
              const msg = gameRef.current?.buildComputeStructure(craftKind) ?? "Game not initialized.";
              setCraftMessage(msg);
              setToast(msg);
              if (msg.toLowerCase().includes("built") || msg.toLowerCase().includes("placed")) { setBuilderOpen(false); gameRef.current?.setPaused(false); }
            }}>Confirm local build · {blueprint(craftKind).length} voxels</button>
            <p className="mt-3 text-[11px] text-muted">The existing engine validates world bounds, player clearance and protected terminals/portals. Five conversational AI agents are future work, not active in this build.</p>
          </section>
        </div>
      )}

      {term && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/75 p-2 sm:items-center sm:p-4">
          <div className="sheet flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="ORE grid terminal">
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-lg font-extrabold text-mint">ORE grid · tier {terminalView.tier}</h2>
                <p className="font-mono text-[10px] text-muted">Live board · read-only · {short(ORE_PROGRAM_ID_STR)}</p>
              </div>
              <button type="button" className="rounded-lg border border-cyan/50 px-2 py-2 text-[10px] font-bold text-cyan" onClick={() => setMarketOpen((v) => !v)}>
                {marketOpen ? "ORE grid" : "Demo trade"}
              </button>
              <button type="button" aria-label="Close terminal" onClick={closeOverlays}>
                <X />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {marketOpen ? (
                <SandboxMarket onClose={() => setMarketOpen(false)} />
              ) : (
                <LiveBoard chain={shownChain} you={yours} layout="grid" tier={terminalView.tier} />
              )}
              <div className="mt-3 grid gap-2 font-mono text-[12px] sm:grid-cols-2">
                <Stat k="Analytics" v={terminalView.historicalAnalytics ? "Verified history" : "History unavailable · not fabricated"} />
                <Stat k="Simulation" v="Unavailable · transactions disabled" />
              </div>
            </div>
            <footer className="relative z-10 border-t border-line bg-surface px-4 py-3">
              <div className="mb-2 rounded-lg border border-danger/70 p-2 text-[11px] leading-relaxed text-danger">
                <div className="font-bold text-fg">Financial operations disabled</div>
                <p className="mt-1">Deploy stays off until a known-good fixture verifies the instruction. The grid above is the live round, not a bet slip.</p>
              </div>
              {!chain.ok && <p className="mb-2 text-xs text-danger">{chain.reason}</p>}
              <button type="button" className="w-full rounded-lg bg-copper py-3 text-sm font-extrabold text-bg opacity-40" disabled>
                Deploy disabled
              </button>
              <button type="button" className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-[11px]" onClick={() => void connect()}>
                {address ? "Refresh wallet" : "Connect wallet"}
              </button>
              <p className="mt-2 text-[11px] text-muted">
                {address ? `${walletName ?? "Wallet"} ${short(address)}` : "Wallet not connected. Public round data is live. Your balance is not guessed."}
                {gate && !gate.ok ? ` · ${gate.checks.find((check) => !check.ok)?.name ?? "gate closed"}` : ""}
              </p>
              <button type="button" className="mt-2 text-[11px] text-cyan underline" onClick={() => setReceiptsOpen(true)}>
                Receipts ({receipts.length})
              </button>
            </footer>
          </div>
        </div>
      )}

      {guide && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-3">
          <div className="sheet w-full max-w-lg overflow-y-auto p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-cyan">Play freely. Verify fairly.</h2>
              <button type="button" aria-label="Close guide" onClick={closeOverlays}>
                <X />
              </button>
            </header>
            <ul className="space-y-3 text-sm">
              <li><b className="text-mint">Explore.</b> Crystal caves, a lava cut, and a sealed chamber are in this world. They are scenery and game blocks.</li>
              <li><b className="text-mint">Mine.</b> Drops are miner coins and items. Breaking a crystal does not mint ORE.</li>
              <li><b className="text-mint">Vault.</b> Scan the chamber, save a local commit, then reveal. A relic from the abyss upgrades the bundle. The commit is not an Entropy transaction, and the payout is not ORE.</li>
              <li><b className="text-mint">Terminal.</b> The board is read from mainnet. Deploy, checkpoint, and claim stay disabled until a known-good transaction pins their layouts.</li>
            </ul>
            <p className="mt-3 text-[11px] text-muted">The four-stage “commit, sample, reveal, finalized” diagram in the showcase is illustrative. This build does not pretend a local hash is a Solana randomness proof.</p>
          </div>
        </div>
      )}

      {vaultOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-3">
          <div className="sheet w-full max-w-lg p-4">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.16em] text-cyan uppercase">07 · Entropy crystal vault</p>
                <h2 className="text-lg font-extrabold">Game challenge</h2>
              </div>
              <button type="button" aria-label="Close vault" onClick={closeOverlays}>
                <X />
              </button>
            </header>
            <ul className="space-y-1 text-sm">
              <li className={snap?.nearVault ? "text-mint" : ""}>1. Vault located</li>
              <li className={snap?.quests.includes("scanned") ? "text-mint" : ""}>2. Chamber scanned</li>
              <li className={vaultCommit ? "text-mint" : ""}>3. Local commit recorded</li>
              <li>4. Reveal pays game items only</li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              Bring a relic from the Amethyst Abyss for the larger bundle: crystals, geodes, and glow ore. Without one, the vault pays the small bundle. Neither bundle is ORE.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" className="rounded-lg border border-cyan py-3 text-xs font-bold text-cyan" onClick={() => setToast(gameRef.current?.scanVault() || "Scanned.")}>
                Scan
              </button>
              <button type="button" className="rounded-lg border border-cyan py-3 text-xs font-bold text-cyan" onClick={() => void commitVault()}>
                Commit
              </button>
              <button type="button" className="rounded-lg bg-mint py-3 text-xs font-extrabold text-bg" onClick={revealVault}>
                Reveal
              </button>
            </div>
          </div>
        </div>
      )}

      {review && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/80 p-3 sm:items-center">
          <div className="sheet w-full max-w-lg p-4">
            <h2 className="text-lg font-extrabold">{review.title}</h2>
            <p className="mt-1 text-xs text-danger">Real mainnet SOL. Cancel if any line looks wrong. Simulation is not a deployment.</p>
            <dl className="mt-3 space-y-1 font-mono text-[11px]">
              {review.lines.map((line) => (
                <div key={line.k} className="flex justify-between gap-3 border-b border-line/60 py-1">
                  <dt className="text-muted">{line.k}</dt>
                  <dd className="max-w-[70%] text-right break-all">{line.v}</dd>
                </div>
              ))}
            </dl>
            {review.error && <pre className="mt-3 max-h-36 overflow-auto text-[11px] whitespace-pre-wrap text-danger">{review.error}</pre>}
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-lg border border-line py-3 text-sm" onClick={() => setReview(null)} disabled={review.busy && review.prepared !== null && !review.error}>
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-copper py-3 text-sm font-extrabold text-bg disabled:opacity-40"
                disabled={!review.prepared || review.busy}
                onClick={() => void confirmReview()}
              >
                {review.busy ? "Working…" : "Sign and send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptsOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/80 p-3">
          <div className="sheet w-full max-w-lg p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Chain receipts</h2>
              <button type="button" aria-label="Close receipts" onClick={() => setReceiptsOpen(false)}>
                <X />
              </button>
            </header>
            <p className="mb-3 text-xs text-muted">Only confirmed signatures. A local hash is not stored as proof.</p>
            <button type="button" className="mb-3 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs" onClick={exportReceipts}>
              <Download className="size-3" /> Export JSON
            </button>
            {receipts.length === 0 && <p className="text-sm text-muted">No confirmed transactions from this browser yet.</p>}
            <div className="space-y-2">
              {receipts.map((r) => (
                <a key={r.signature} href={r.explorer} target="_blank" rel="noreferrer" className="block rounded-lg border border-line p-3 font-mono text-[11px]">
                  <div className="flex justify-between text-mint">
                    <span>{r.kind}</span>
                    <span>{r.slot ? `slot ${r.slot}` : "confirmed"}</span>
                  </div>
                  <div className="mt-1 break-all text-muted">{r.signature}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function biomeAt(dimension: string, x: number, y: number, z: number): string {
  if (dimension.includes("Amethyst")) return y < 10 ? "Geode Pocket" : "Amethyst Hall";
  if (dimension.includes("Ember")) return y < 8 ? "Magma Cut" : "Ember Shelf";
  if (x > 30 && z < 16 && y < 14) return "Crystal Vault";
  if (y < 8) return "Deep Vein";
  if (z > 30) return "Crystal Caves";
  return "Surface Cut";
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-line px-2 py-2">
      <div className="text-[10px] tracking-wider text-muted uppercase">{k}</div>
      <div>{v}</div>
    </div>
  );
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  function setFrom(clientX: number, clientY: number) {
    const el = base.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = rect.width / 2;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    onChange(dx / max, -dy / max);
  }
  return (
    <div
      ref={base}
      className="absolute bottom-6 left-5 size-32 rounded-full border border-cyan/40 bg-cyan/10"
      onPointerDown={(e) => {
        active.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setFrom(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (active.current) setFrom(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        active.current = false;
        onChange(0, 0);
      }}
    />
  );
}
