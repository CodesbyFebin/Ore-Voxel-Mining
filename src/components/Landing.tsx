import { useMemo, useState } from "react";

const COLORS = ["#00e5d4", "#ff8833", "#a855f7", "#00d4ff", "#ffaa44", "#c084fc"];

function unit(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const NAV = ["EXPLORE", "MINE", "COLLECT", "CONNECT"] as const;

const NOTES: Record<(typeof NAV)[number], string> = {
  EXPLORE: "The caves are free. Crystal, lava, and the vault are game space.",
  MINE: "Broken blocks pay miner coins and items. They never mint ORE.",
  COLLECT: "Craft, repair, and the vault stay in this browser.",
  CONNECT: "A wallet connects inside the terminal, after you launch. Balances stay blank until then.",
};

export function Landing({ onLaunch }: { onLaunch: () => void }) {
  const [nav, setNav] = useState<(typeof NAV)[number]>("EXPLORE");
  const [docs, setDocs] = useState(false);
  const crystals = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        size: 8 + unit(i + 1) * 28,
        color: COLORS[Math.floor(unit(i + 3) * COLORS.length)],
        opacity: 0.25 + unit(i + 5) * 0.45,
        dur: 7 + unit(i + 7) * 9,
        delay: unit(i + 9) * 8,
        drift: -10 - unit(i + 11) * 24,
        left: unit(i + 13) * 100,
        top: unit(i + 15) * 100,
      })),
    [],
  );

  return (
    <div className="land">
      <div className="land-base" />
      <div className="land-grid" />
      <div className="land-crystals" aria-hidden>
        {crystals.map((c, i) => (
          <i
            key={i}
            className="land-crystal"
            style={{
              ["--size" as string]: `${c.size}px`,
              ["--color" as string]: c.color,
              ["--glow" as string]: `${c.size * 0.4}px`,
              ["--opacity" as string]: c.opacity,
              ["--dur" as string]: `${c.dur}s`,
              ["--delay" as string]: `${c.delay}s`,
              ["--drift" as string]: `${c.drift}px`,
              left: `${c.left}%`,
              top: `${c.top}%`,
            }}
          />
        ))}
      </div>
      <div className="land-vignette" />
      <i className="land-corner tl" />
      <i className="land-corner tr" />
      <i className="land-corner bl" />
      <i className="land-corner br" />

      <svg className="land-character" viewBox="0 0 120 160" aria-hidden>
        <rect x="45" y="10" width="30" height="28" rx="2" fill="#1a2a3a" stroke="#00e5d4" />
        <rect x="50" y="18" width="8" height="4" fill="#00e5d4" opacity="0.8" />
        <rect x="62" y="18" width="8" height="4" fill="#00e5d4" opacity="0.8" />
        <rect x="40" y="40" width="40" height="45" rx="2" fill="#12202c" stroke="#00e5d4" strokeWidth="0.5" />
        <rect x="55" y="50" width="10" height="10" fill="#00e5d4" opacity="0.6" />
        <rect x="25" y="42" width="14" height="35" rx="2" fill="#1a2a3a" stroke="#00e5d4" strokeWidth="0.5" />
        <rect x="81" y="42" width="14" height="35" rx="2" fill="#1a2a3a" stroke="#00e5d4" strokeWidth="0.5" />
        <rect x="42" y="87" width="16" height="40" rx="2" fill="#0a1520" stroke="#00e5d4" strokeWidth="0.5" />
        <rect x="62" y="87" width="16" height="40" rx="2" fill="#0a1520" stroke="#00e5d4" strokeWidth="0.5" />
        <rect x="88" y="28" width="6" height="36" rx="1" fill="#6b4423" transform="rotate(28 91 46)" />
        <path d="M78 18 L108 8 L104 18 Z" fill="#c98a5a" />
      </svg>

      <div className="land-content">
        <nav className="land-nav">
          <div className="land-nav-left">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden>
              <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" stroke="#00e5d4" strokeWidth="1.5" fill="rgba(0,229,212,.1)" />
              <path d="M16 8 L22 11.5 L22 18.5 L16 22 L10 18.5 L10 11.5 Z" fill="#ff8833" />
            </svg>
            <div className="land-links">
              {NAV.map((item) => (
                <button key={item} type="button" className={item === nav ? "active" : ""} onClick={() => setNav(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="land-sol">
            <i className="land-sol-mark" />
            SOLANA
          </div>
        </nav>

        <div className="land-hero">
          <h1 className="land-title">
            <span>Edge</span>
            <svg viewBox="0 0 40 40" width="0.78em" height="0.78em" aria-hidden>
              <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" stroke="#00e5d4" strokeWidth="2" fill="rgba(0,229,212,.15)" />
              <path d="M20 10 L30 16 L30 26 L20 32 L10 26 L10 16 Z" fill="#ff8833" />
              <path d="M20 14 L26 18 L26 24 L20 28 L14 24 L14 18 Z" fill="#fff" opacity="0.7" />
            </svg>
            <span className="re">RE:</span>
          </h1>
          <div className="land-sub">Voxel Mining World</div>
          <div className="land-tag">
            <span className="play">Play Freely.</span> Connect to Real <span className="ore">ORE v4 Mining.</span>
          </div>
          <p className="land-desc">
            An original voxel-inspired 3D mining adventure with genuine on-chain ORE access. Miner coins never become ORE.
          </p>
          <p className="land-note">{NOTES[nav]}</p>
          <div className="land-features">
            <Feature label={"EXPLORE\nVAST CAVES"} d="M8 32 L20 8 L32 32 Z M14 22 H26 M20 8 V32" />
            <Feature label={"MINE\nRARE ORE"} d="M20 4 L28 14 V26 L20 36 L12 26 V14 Z M20 12 L24 17 V23 L20 28 L16 23 V17 Z" />
            <Feature label={"PLAY\nYOUR WAY"} d="M8 12 L20 4 L32 12 V28 L20 36 L8 28 Z M8 12 L20 20 L32 12 M20 20 V36" />
            <Feature label={"ON-CHAIN\nREWARDS"} d="M10 20 A10 10 0 1 0 30 20 A10 10 0 1 0 10 20 M15 20 H25 M20 15 V25" />
          </div>
          <div className="land-cta">
            <button type="button" className="land-launch" onClick={onLaunch}>
              Launch game
            </button>
            <button type="button" className="land-docs" onClick={() => setDocs(true)}>
              Read docs
            </button>
          </div>
        </div>
      </div>

      <div className="land-side">
        BUILT
        <br />
        FOR
        <br />
        EXPLORERS
        <br />
        IN A
        <br />
        BIGGER
        <br />
        WORLD
      </div>
      <div className="land-bar">
        <span>
          <i className="land-dot" /> SYSTEM ONLINE · PROTOCOL-SAFE
        </span>
        <span>© {new Date().getFullYear()} EDGEORE</span>
      </div>

      {docs && (
        <div className="land-docs-layer">
          <div className="land-docs-card">
            <header>
              <h2>How this build works</h2>
              <button type="button" onClick={() => setDocs(false)}>
                Close
              </button>
            </header>
            <p>Launch the caves for free. Mine, craft, and open the vault. Those rewards are game items.</p>
            <p>The ORE terminal reads the live mainnet board. Deploy, checkpoint, and claim stay off until a known-good transaction pins their layouts. A wallet signature is never requested for an unpinned layout.</p>
            <p>A local commit in the vault is not an Entropy proof. A “you won” line is never invented here.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ label, d }: { label: string; d: string }) {
  return (
    <div className="land-feature">
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={d} />
      </svg>
      <span>
        {label.split("\n").map((line) => (
          <span key={line}>
            {line}
            <br />
          </span>
        ))}
      </span>
    </div>
  );
}
