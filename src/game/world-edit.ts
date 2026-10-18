import { WX, WY, WZ, idx, inWorld } from "./world.ts";
import { BLOCK_COUNT } from "./blocks.ts";

/** Original, bounded voxel-edit primitives inspired by WorldEdit workflows; no source copied. */
export type VoxelCell = { x:number; y:number; z:number };
export type EditDelta = VoxelCell & { before:number; after:number };
export type EditBatch = { deltas:EditDelta[] };
export function fillCuboid(
  blocks: Uint8Array,
  a: VoxelCell,
  b: VoxelCell,
  blockId: number,
  maxCells = 4096,
): EditBatch {
  if (blocks.length !== WX*WY*WZ) throw new RangeError("Unexpected voxel buffer size");
  if (!Number.isSafeInteger(blockId) || blockId < 0 || blockId >= BLOCK_COUNT) throw new RangeError("Invalid block ID");
  if (![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isSafeInteger)) throw new RangeError("Invalid coordinates");
  if (!inWorld(a.x,a.y,a.z) || !inWorld(b.x,b.y,b.z)) throw new RangeError("Selection outside world");
  if (!Number.isSafeInteger(maxCells) || maxCells < 1) throw new RangeError("Invalid edit limit");
  const x0=Math.min(a.x,b.x), x1=Math.max(a.x,b.x);
  const y0=Math.min(a.y,b.y), y1=Math.max(a.y,b.y);
  const z0=Math.min(a.z,b.z), z1=Math.max(a.z,b.z);
  const volume=(x1-x0+1)*(y1-y0+1)*(z1-z0+1);
  if(volume>maxCells)throw new RangeError("Edit exceeds cell budget");
  const deltas:EditDelta[]=[];
  for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
    const offset=idx(x,y,z),before=blocks[offset];
    if(before===blockId)continue;
    deltas.push({x,y,z,before,after:blockId});
  }
  for(const d of deltas)blocks[idx(d.x,d.y,d.z)]=d.after;
  return {deltas};
}
export function undoEdit(blocks:Uint8Array,batch:EditBatch):void{
  if(blocks.length!==WX*WY*WZ)throw new RangeError("Unexpected voxel buffer size");
  for(const d of batch.deltas){
    if(!inWorld(d.x,d.y,d.z))throw new RangeError("Invalid undo coordinate");
    if(blocks[idx(d.x,d.y,d.z)]!==d.after)throw new Error("Edit conflict: voxel changed after batch");
  }
  for(const d of batch.deltas)blocks[idx(d.x,d.y,d.z)]=d.before;
}
