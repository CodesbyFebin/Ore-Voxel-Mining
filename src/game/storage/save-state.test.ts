import test from "node:test";
import assert from "node:assert/strict";
import { generateWorld } from "../world.ts";
import { validPose, validMachines } from "./save-state.ts";
import { floorChunkCoordinate, localVoxelCoordinate, stratumFromY, stratumFromChunkY, cubicChunkKey } from "../vertical-strata.ts";
test("signed cubic coordinates preserve negative-Y indexing",()=>{
 assert.equal(floorChunkCoordinate(-1),-1);assert.equal(localVoxelCoordinate(-1),15);
 assert.equal(floorChunkCoordinate(-64),-4);assert.equal(localVoxelCoordinate(-64),0);
 assert.equal(stratumFromY(64),"valley");assert.equal(stratumFromY(63),"geode");assert.equal(stratumFromY(-1),"ember");
 assert.equal(stratumFromChunkY(-4),"ember");assert.equal(stratumFromChunkY(4),"valley");
 assert.equal(cubicChunkKey(2,-4,-1),"[2,-4,-1]");
 assert.throws(()=>stratumFromY(128));
});
test("player pose rejects solid blocks and preserves safe saved coordinates",()=>{
 const world=generateWorld(0xe47e,"valley");
 const p=world.spawn;
 const pose={x:p.x,y:p.y,z:p.z,yaw:1.2,pitch:0.2};
 assert.equal(validPose(pose,world),true);
 assert.equal(validPose({...pose,y:0},world),false);
 assert.equal(validPose({...pose,x:Infinity},world),false);
});
test("machine metadata is bounded and cannot smuggle non-primitive fields",()=>{
 assert.equal(validMachines([{id:"forge1",type:"furnace",x:2,y:15,z:2,tier:1,customData:{fuel:4}}]),true);
 assert.equal(validMachines([{id:"forge1",type:"furnace",x:2,y:15,z:2,tier:1,customData:{walletSecret:{x:1}}}]),false);
});
