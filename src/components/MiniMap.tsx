import { useEffect, useRef } from "react";
import type { HudSnapshot } from "@/game/engine";

/** Read-only local game radar. All coordinates originate from the engine HUD. */
export function MiniMap({hud}:{hud:HudSnapshot}) {
  const ref=useRef<HTMLCanvasElement>(null);
  const {x,y,z,yaw,shaftX,shaftZ}=hud;
  useEffect(()=>{
    const ctx=ref.current?.getContext("2d");
    if(!ctx)return;
    const center=65,radius=54,scale=1.2;
    ctx.clearRect(0,0,130,130);
    ctx.save();
    ctx.beginPath();ctx.arc(center,center,radius,0,Math.PI*2);
    ctx.fillStyle="rgba(5,18,21,.91)";ctx.fill();
    ctx.strokeStyle="#14f195";ctx.lineWidth=2;ctx.stroke();ctx.clip();
    ctx.strokeStyle="rgba(20,241,149,.16)";ctx.lineWidth=0.75;
    for(let i=-54;i<=54;i+=18){ctx.beginPath();ctx.moveTo(center+i,0);ctx.lineTo(center+i,130);ctx.moveTo(0,center+i);ctx.lineTo(130,center+i);ctx.stroke();}
    const dx=shaftX-x,dz=shaftZ-z;
    const radial=Math.hypot(dx,dz);
    const ratio=radial>0?Math.min(scale,(radius-8)/radial):0;
    ctx.beginPath();ctx.arc(center+dx*ratio,center+dz*ratio,4.5,0,Math.PI*2);
    ctx.fillStyle="#c084fc";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.stroke();
    ctx.translate(center,center);ctx.rotate(-yaw);
    ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();
    ctx.fillStyle="#14f195";ctx.fill();
    ctx.restore();
  },[x,z,yaw,shaftX,shaftZ]);
  return <aside className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-center gap-1" aria-label="Local voxel map, player coordinates and distance to shaft">
    <canvas ref={ref} width={130} height={130} aria-hidden="true"/>
    <div className="rounded-md border border-mint/40 bg-bg/90 px-2 py-1 text-center font-mono text-[10px] text-mint">
      <div>{Math.floor(x)}, {Math.floor(y)}, {Math.floor(z)}</div>
      <div className="text-purple-300">Shaft {Math.round(Math.hypot(shaftX-x,shaftZ-z))}m</div>
    </div>
  </aside>;
}
