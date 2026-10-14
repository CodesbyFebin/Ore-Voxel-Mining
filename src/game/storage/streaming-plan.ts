import { floorChunkCoordinate, cubicChunkKey } from "../vertical-strata.ts";
export type ChunkCoord={cx:number;cy:number;cz:number};
export type StreamingDelta={center:ChunkCoord;load:ChunkCoord[];unload:ChunkCoord[]};
/** Pure desired-chunk planner; not yet a replacement for the current bounded mesh renderer. */
export function planActiveChunks(
 player:{x:number;y:number;z:number},
 active:ReadonlySet<string>,
 horizontalRadius=2,
 verticalRadius=1,
 maxYChunks:{min:number;max:number}={min:-4,max:7},
):StreamingDelta{
 if(![player.x,player.y,player.z].every(Number.isFinite))throw new RangeError("Non-finite player coordinate");
 if(!Number.isSafeInteger(horizontalRadius)||horizontalRadius<0||horizontalRadius>12||
    !Number.isSafeInteger(verticalRadius)||verticalRadius<0||verticalRadius>12)throw new RangeError("Invalid streaming radius");
 const center={cx:floorChunkCoordinate(Math.floor(player.x)),cy:floorChunkCoordinate(Math.floor(player.y)),cz:floorChunkCoordinate(Math.floor(player.z))};
 const needed=new Map<string,ChunkCoord>();
 for(let dy=-verticalRadius;dy<=verticalRadius;dy++){
  const cy=center.cy+dy;
  if(cy<maxYChunks.min||cy>maxYChunks.max)continue;
  for(let dz=-horizontalRadius;dz<=horizontalRadius;dz++)for(let dx=-horizontalRadius;dx<=horizontalRadius;dx++){
   const coord={cx:center.cx+dx,cy,cz:center.cz+dz};
   needed.set(cubicChunkKey(coord.cx,coord.cy,coord.cz),coord);
  }
 }
 const load=[...needed].filter(([key])=>!active.has(key)).map(([,c])=>c);
 load.sort((a,b)=>(a.cx-center.cx)**2+(a.cy-center.cy)**2+(a.cz-center.cz)**2-((b.cx-center.cx)**2+(b.cy-center.cy)**2+(b.cz-center.cz)**2));
 const unload:ChunkCoord[]=[];
 for(const key of active)if(!needed.has(key)){
  try{
   const parsed=JSON.parse(key) as unknown;
   if(Array.isArray(parsed)&&parsed.length===3&&parsed.every(Number.isSafeInteger))unload.push({cx:parsed[0],cy:parsed[1],cz:parsed[2]});
  }catch{ /* ignore corrupt cache keys */ }
 }
 return {center,load,unload};
}
