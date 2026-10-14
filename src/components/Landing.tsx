import { useState } from "react";
import { Compass, Pickaxe, Gem, Blocks, Gamepad2, Monitor, ExternalLink, X } from "lucide-react";

/** Public game landing. The cinematic art is illustrative; chain operations remain disabled. */
export function Landing({ onLaunch }: { onLaunch: () => void }) {
  const [info, setInfo] = useState(false);
  return (
    <main className="edge-landing">
      <div className="edge-scene" aria-hidden="true" />
      <div className="edge-scene-shade" aria-hidden="true" />
      <div className="edge-stars" aria-hidden="true" />
      <header className="edge-topbar">
        <a href="/" className="edge-brand" aria-label="EdgeORE home"><span className="edge-ring">O</span><span>EDGE<span className="edge-orange">ORE</span></span></a>
        <div className="edge-top-actions">
          <span className="edge-beta">PUBLIC PLAYTEST</span>
          <button type="button" className="edge-top-link" onClick={() => setInfo(true)}>ABOUT</button>
          <a className="edge-top-link" href="https://github.com/CodesbyFebin/Ore-Voxel-Mining" target="_blank" rel="noopener noreferrer">SOURCE <ExternalLink size={12}/></a>
        </div>
      </header>

      <section className="edge-hero">
        <div className="edge-logo-lockup" aria-label="EdgeORE">
          <div className="edge-logo-mark" aria-hidden="true"><span>O</span></div>
          <h1 className="edge-wordmark"><span>Edge</span><strong>ORE</strong></h1>
        </div>
        <p className="edge-tagline">Bringing <em>Solana ORE</em> Mining Into a<br className="edge-wide-break"/> Minecraft-Inspired <b>Voxel World</b></p>
        <div className="edge-feature-row">
          <div className="edge-feature"><div className="edge-feature-icon"><Blocks size={30}/></div><span>Playable<br/><strong>voxel world</strong></span></div>
          <div className="edge-feature"><div className="edge-feature-icon"><Gem size={30}/></div><span>ORE grid<br/><strong>read-only board</strong></span></div>
          <div className="edge-feature"><div className="edge-feature-icon"><Monitor size={30}/></div><span>In-game<br/><strong>mining terminal</strong></span></div>
        </div>
        <div className="edge-hero-actions">
          <button type="button" className="edge-launch" onClick={onLaunch}><Pickaxe size={22}/> LAUNCH GAME <span aria-hidden="true">→</span></button>
          <span className="edge-hero-caption">Free browser playtest · No SOL spending</span>
        </div>
      </section>

      <nav className="edge-bottom-nav" aria-label="Game features">
        <span><Compass size={22}/> Exploration</span><i/>
        <span><Pickaxe size={22}/> Crafting</span><i/>
        <span><Gem size={22}/> Portals</span><i/>
        <span><Gamepad2 size={22}/> ORE Integration</span>
      </nav>
      <p className="edge-disclaimer">Independent experimental game. Block rewards and demo trading/staking are virtual. Real ORE transactions are disabled.</p>

      {info && <div className="edge-info-backdrop" role="presentation" onClick={() => setInfo(false)}>
        <section className="edge-info-modal" role="dialog" aria-modal="true" aria-label="About EdgeORE" onClick={e => e.stopPropagation()}>
          <button type="button" className="edge-info-close" onClick={() => setInfo(false)} aria-label="Close about panel"><X/></button>
          <h2>Explore the EdgeORE worlds</h2>
          <p>Mine voxel blocks, craft tools, and travel through purple and orange portals. Portals bring you to the informational ORE Grid terminal.</p>
          <p>View available public protocol data, or try the entirely local demo trading and staking simulator. The game does not mint ORE tokens or initiate financial transactions.</p>
          <button type="button" className="edge-launch" onClick={() => {setInfo(false);onLaunch();}}>PLAY NOW →</button>
        </section>
      </div>}
    </main>
  );
}
