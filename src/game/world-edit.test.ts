import assert from "node:assert/strict";
import test from "node:test";
import { WX,WY,WZ,idx } from "./world.ts";
import { fillCuboid,undoEdit } from "./world-edit.ts";
import { surfaceHeightmap,surfaceBlockIds,minimapRgba } from "./minimap.ts";
test("bounded voxel edits and undo",()=>{
 const voxels=new Uint8Array(WX*WY*WZ);
 const batch=fillCuboid(voxels,{x:1,y:2,z:3},{x:2,y:3,z:4},2);
 assert.equal(batch.deltas.length,8);
 assert.equal(voxels[idx(1,2,3)],2);
 undoEdit(voxels,batch);
 assert.equal(voxels[idx(1,2,3)],0);
});
test("out-of-range selection fails atomically",()=>{
 const voxels=new Uint8Array(WX*WY*WZ);
 assert.throws(()=>fillCuboid(voxels,{x:0,y:0,z:0},{x:WX-1,y:WY-1,z:WZ-1},2,8),/budget/);
 assert.equal(voxels.some(x=>x!==0),false);
});
test("minimap finds highest block per column",()=>{
 const voxels=new Uint8Array(WX*WY*WZ);
 voxels[idx(2,5,3)]=8;voxels[idx(2,9,3)]=11;
 assert.equal(surfaceHeightmap(voxels)[2+3*WX],10);
 assert.equal(surfaceBlockIds(voxels)[2+3*WX],11);
 assert.equal(minimapRgba(surfaceBlockIds(voxels)).length,WX*WZ*4);
});
