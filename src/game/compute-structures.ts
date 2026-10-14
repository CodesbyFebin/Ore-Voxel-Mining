import { AIR } from "./blocks.ts";
import { WX, WY, WZ, idx, type WorldData, editKey, type EditMap } from "./world.ts";

/** Original EdgeORE block-art inspired by CraftGPT's modular redstone compute layout.
 *  These structures are NOT functioning neural models or CraftGPT weights.
 */
export const COMPUTE_STRUCTURES = {
  embedding: { label: "Embedding Array", description: "Token-memory pillars", color: "cyan" },
  attention: { label: "Attention Hall", description: "Five-head circuit gallery", color: "purple" },
  arithmetic: { label: "Fixed-Point ALU", description: "Binary arithmetic lanes", color: "orange" },
  memory: { label: "Context Memory", description: "64-slot context exhibit", color: "green" },
} as const;
export type ComputeStructure = keyof typeof COMPUTE_STRUCTURES;
export type VoxelPlacement = {x:number;y:number;z:number;id:number};
export function blueprint(kind:ComputeStructure):VoxelPlacement[] {
 const cells = new Map<string,VoxelPlacement>();
 const put=(x:number,y:number,z:number,id:number)=>cells.set(`${x},${y},${z}`,{x,y,z,id});
 for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++)put(x,0,z,3);
 if(kind==="embedding"){
  for(let i=0;i<8;i++){const x=-4+(i%4)*3,z=-3+Math.floor(i/4)*6;for(let y=1;y<=4;y++)put(x,y,z,y===4?11:16)}
 } else if(kind==="attention"){
  for(let h=0;h<5;h++){const x=-4+h*2;for(let z=-3;z<=3;z++)put(x,1,z,16);for(let y=2;y<=4;y++)put(x,y,0,11)}
 } else if(kind==="arithmetic"){
  for(let lane=-3;lane<=3;lane+=2)for(let x=-4;x<=4;x++)put(x,1,lane,(x+lane)%4===0?8:5);
  for(let x=-4;x<=4;x+=2)put(x,2,0,11);
 } else {
  for(let i=0;i<64;i++){const x=-4+(i%8),z=-4+Math.floor(i/8);put(x,1,z,i%8===0?11:16)}
 }
 return [...cells.values()];
}
export type BuildResult={ok:true;edits:EditMap;count:number}|{ok:false;reason:string};
export function planStructure(world:WorldData, kind:ComputeStructure, anchor:{x:number;y:number;z:number}, player:{x:number;y:number;z:number}):BuildResult {
 if(!Object.prototype.hasOwnProperty.call(COMPUTE_STRUCTURES,kind))return {ok:false,reason:"Unknown structure"};
 const plan=blueprint(kind);
 const edits:EditMap={};
 const ax=Math.floor(anchor.x), ay=Math.floor(anchor.y),az=Math.floor(anchor.z);
 if(ax<7||az<7||ax>WX-8||az>WZ-8||ay<2||ay>WY-7)return {ok:false,reason:"Choose a clear interior area within world bounds."};
 if(Math.hypot(ax-player.x,az-player.z)<7)return {ok:false,reason:"Move away from the planned build zone."};
 for(const p of plan){
  const x=ax+p.x,y=ay+p.y,z=az+p.z;
  if(x<0||z<0||y<1||x>=WX||z>=WZ||y>=WY)return {ok:false,reason:"Structure exceeds world boundaries."};
  if(world.blocks[idx(x,y,z)]!==AIR)return {ok:false,reason:"Build zone is occupied. Choose an open area."};
  if(Math.hypot(x-world.terminal.x,z-world.terminal.z)<7 || Math.hypot(x-world.vault.x,z-world.vault.z)<7)return {ok:false,reason:"Cannot build over a protected terminal or vault."};
  if(world.portals.some(g=>Math.hypot(x-g.x,z-g.z)<7))return {ok:false,reason:"Cannot build near protected portals."};
  edits[editKey(x,y,z)]=p.id;
 }
 return {ok:true,edits,count:plan.length};
}
