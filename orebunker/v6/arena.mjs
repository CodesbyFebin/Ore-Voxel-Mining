// Authoritative rules reusable by web and dedicated servers; never represents financial payouts.
import {BLOCK, WORLD_WIDTH, WORLD_HEIGHT} from "./world.mjs";
export const ARENA_STATE=Object.freeze({LOBBY:"LOBBY_READY_UP",ACTIVE:"ACTIVE_HUNT",VERIFY:"POST_ROUND_VERIFICATION"});
export class Arena {
 constructor({durationMs=60000,clock=()=>Date.now()}={}){
  if(!Number.isSafeInteger(durationMs)||durationMs<=0)throw new RangeError("duration");
  this.durationMs=durationMs;this.clock=clock;this.phase=ARENA_STATE.LOBBY;
  this.players=new Map();this.digged=new Set();this.startedAt=null;this.finishedAt=null;
 }
 join(id){if(this.phase!==ARENA_STATE.LOBBY)throw Error("round in progress");if(typeof id!=="string"||!/^[a-zA-Z0-9_-]{3,32}$/.test(id))throw Error("invalid id");if(this.players.size>=25&&!this.players.has(id))throw Error("lobby full");if(!this.players.has(id))this.players.set(id,{id,ready:false,score:0});return this.snapshot()}
 ready(id,value=true){if(this.phase!==ARENA_STATE.LOBBY)throw Error("not lobby");const p=this.players.get(id);if(!p)throw Error("not joined");p.ready=Boolean(value);return this.snapshot()}
 start(){if(this.phase!==ARENA_STATE.LOBBY||this.players.size<2||![...this.players.values()].every(p=>p.ready))throw Error("lobby not ready");this.startedAt=this.clock();this.phase=ARENA_STATE.ACTIVE;return this.snapshot()}
 tick(){if(this.phase===ARENA_STATE.ACTIVE&&this.clock()-this.startedAt>=this.durationMs){this.phase=ARENA_STATE.VERIFY;this.finishedAt=this.startedAt+this.durationMs}return this.snapshot()}
 mine(id,x,y,block){
  this.tick();if(this.phase!==ARENA_STATE.ACTIVE)return {ok:false,reason:"ROUND_INACTIVE"};
  if(!this.players.has(id))return {ok:false,reason:"NOT_JOINED"};
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=WORLD_WIDTH||y<0||y>=WORLD_HEIGHT)return {ok:false,reason:"OUTSIDE_ARENA"};
  const key=x+","+y;if(this.digged.has(key))return {ok:false,reason:"DUPLICATE"};
  const points=block===BLOCK.ORE||block===BLOCK.SOLANA||block===BLOCK.DIAMOND?25:block===BLOCK.COAL?3:block===BLOCK.STONE?1:0;
  if(!points)return {ok:false,reason:"INVALID_BLOCK"};
  this.digged.add(key);this.players.get(id).score+=points;
  return {ok:true,points,score:this.players.get(id).score};
 }
 snapshot(){const players=[...this.players.values()].map(p=>({...p})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));return {phase:this.phase,startedAt:this.startedAt,finishedAt:this.finishedAt,remainingMs:this.startedAt===null?this.durationMs:Math.max(0,this.durationMs-(this.clock()-this.startedAt)),players,winner:this.phase===ARENA_STATE.VERIFY?players[0]?.id??null:null}}
}
