// OreBunker v6 deterministic cave generation and fictional mining economy.
export const BLOCK = Object.freeze({AIR:0,STONE:1,COAL:2,DIAMOND:3,ORE:4,SOLANA:5,BEDROCK:6});
export const BLOCK_INFO = Object.freeze({
  [BLOCK.AIR]:{name:"Air",solid:false,hardness:0,score:0},
  [BLOCK.STONE]:{name:"Stone",solid:true,hardness:1,score:1},
  [BLOCK.COAL]:{name:"Coal",solid:true,hardness:2,score:3},
  [BLOCK.DIAMOND]:{name:"Diamond",solid:true,hardness:5,score:25},
  [BLOCK.ORE]:{name:"ORE emblem mineral",solid:true,hardness:4,score:25},
  [BLOCK.SOLANA]:{name:"Solana emblem mineral",solid:true,hardness:4,score:25},
  [BLOCK.BEDROCK]:{name:"Bedrock",solid:true,hardness:Infinity,score:0}
});
const W=48,H=48;
export const WORLD_WIDTH=W;
export const WORLD_HEIGHT=H;
export function hash32(a){a|=0;a=(a^a>>>16)*0x7feb352d|0;a=(a^a>>>15)*0x846ca68b|0;return (a^a>>>16)>>>0}
export function randomAt(seed,x,y,salt=0){return hash32((seed|0)^Math.imul(x|0,73856093)^Math.imul(y|0,19349663)^(salt|0))/4294967296}
export function generateWorld(seed=2026){
 if(!Number.isSafeInteger(seed))throw new TypeError("seed must be a safe integer");
 const tiles=new Uint8Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x;
  if(x===0||y===0||x===W-1||y===H-1){tiles[i]=BLOCK.BEDROCK;continue}
  const n=randomAt(seed,x,y);
  const tunnel=Math.sin(x*.19+seed*.0001)+Math.cos(y*.23)+Math.sin((x+y)*.15);
  if(tunnel>1.23||n<.125){tiles[i]=BLOCK.AIR;continue}
  const ore=randomAt(seed,x,y,7);
  tiles[i]=ore<.008?BLOCK.SOLANA:ore<.021?BLOCK.ORE:ore<.038?BLOCK.DIAMOND:ore<.126?BLOCK.COAL:BLOCK.STONE;
 }
 // Ensure a navigable central spawn and reachable adjacent cells.
 const sx=W>>1,sy=H>>1;
 for(let y=sy-2;y<=sy+2;y++)for(let x=sx-2;x<=sx+2;x++)tiles[y*W+x]=BLOCK.AIR;
 return {version:6,seed,width:W,height:H,tiles};
}
export function getBlock(world,x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=world.width||y>=world.height)return BLOCK.BEDROCK;
 return world.tiles[y*world.width+x];
}
export function excavate(world,x,y,player,now=Date.now()){
 if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isFinite(now))return {ok:false,reason:"INVALID_INPUT"};
 const b=getBlock(world,x,y), info=BLOCK_INFO[b];
 if(b===BLOCK.AIR)return {ok:false,reason:"EMPTY"};
 if(b===BLOCK.BEDROCK)return {ok:false,reason:"UNBREAKABLE"};
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y)||!Number.isFinite(player.toolTier))return {ok:false,reason:"INVALID_PLAYER"};
 if(Math.hypot(x+.5-player.x,y+.5-player.y)>4.5)return {ok:false,reason:"OUT_OF_REACH"};
 if(player.toolTier<info.hardness)return {ok:false,reason:"TOOL_TOO_WEAK"};
 world.tiles[y*world.width+x]=BLOCK.AIR;
 return {ok:true,block:b,item:info.name,credits:info.score,time:now,virtualOnly:true};
}
export function serializeWorld(world){
 return JSON.stringify({version:6,seed:world.seed,width:world.width,height:world.height,tiles:Array.from(world.tiles)});
}
export function deserializeWorld(text){
 const o=JSON.parse(text);
 if(o.version!==6||o.width!==W||o.height!==H||!Array.isArray(o.tiles)||o.tiles.length!==W*H||o.tiles.some(v=>!Number.isInteger(v)||v<0||v>BLOCK.BEDROCK))throw new Error("Invalid v6 save");
 return {version:6,seed:o.seed,width:W,height:H,tiles:Uint8Array.from(o.tiles)};
}
