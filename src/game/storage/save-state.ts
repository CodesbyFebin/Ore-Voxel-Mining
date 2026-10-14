import { WX, WY, WZ, idx, type WorldData } from "../world.ts";
export type PlayerPose = { x:number;y:number;z:number;yaw:number;pitch:number };
export type MachineEntity = { id:string;type:"terminal"|"furnace"|"refinery";x:number;y:number;z:number;tier:number;customData:Record<string,string|number|boolean> };
export function validPose(p:unknown,world:WorldData):p is PlayerPose {
 if(!p||typeof p!=="object")return false;
 const v=p as Partial<PlayerPose>;
 if (![v.x,v.y,v.z,v.yaw,v.pitch].every(a=>typeof a==="number"&&Number.isFinite(a)))return false;
 const x=v.x!,y=v.y!,z=v.z!;
 if(x<0.3||x>=WX-0.3||z<0.3||z>=WZ-0.3||y<1||y>=WY-3||Math.abs(v.pitch!)>Math.PI/2+0.05)return false;
 // Preserve a safe respawn fallback when an old save lands inside edited terrain.
 for(let py=Math.floor(y);py<=Math.floor(y+1.7);py++){
  if(world.blocks[idx(Math.floor(x),py,Math.floor(z))]!==0)return false;
 }
 return true;
}
export function validMachines(rows:unknown):rows is MachineEntity[]{
 if(!Array.isArray(rows)||rows.length>256)return false;
 const ids=new Set<string>();
 for(const m of rows){
  if(!m||typeof m!=="object"||typeof m.id!=="string"||m.id.length>90||ids.has(m.id)||!["terminal","furnace","refinery"].includes(m.type))return false;
  ids.add(m.id);
  if(![m.x,m.y,m.z,m.tier].every(Number.isSafeInteger)||m.x<0||m.x>=WX||m.y<1||m.y>=WY||m.z<0||m.z>=WZ||m.tier<0||m.tier>10)return false;
  if(!m.customData||typeof m.customData!=="object"||Array.isArray(m.customData))return false;
  for(const [k,v] of Object.entries(m.customData))if(k.length>64||!(typeof v==="string"&&v.length<=256||typeof v==="number"&&Number.isFinite(v)||typeof v==="boolean"))return false;
 }
 return true;
}
