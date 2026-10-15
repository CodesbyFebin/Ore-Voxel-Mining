// @ts-nocheck — JavaScript fixture/import validation is exercised by Node tests; TypeScript checks the typed engine adapter.
import test from "node:test";
import assert from "node:assert/strict";
import { compileBlueprint } from "./blueprint-bridge.mjs";
import { placeIntoEdgeOre } from "./placement-adapter.mjs";
import { registryFromBlocks } from "./registry.mjs";
const BLOCKS = [{id:0,name:"Air",placeable:false},{id:3,name:"Basalt",placeable:true},{id:13,name:"Timber",placeable:true},{id:17,name:"Bedrock",placeable:false}];
const bp={size:[2,1,1],palette:{B:"edgeore:basalt"},layers:["BB"]};
function context(){
 const data=new Map(),edits=[],calls={saves:0,backups:0};
 const ctx={BLOCKS,WX:64,WY:24,WZ:64,shaft:{x:30,z:30},player:{x:3,y:8,z:3},terminal:{x:40,z:40},vault:{x:45,z:45},portals:[],machines:[],
  readBlock:(x,y,z)=>data.get(`${x},${y},${z}`)??0,
  writeBlock:(x,y,z,id)=>{data.set(`${x},${y},${z}`,id);edits.push([x,y,z,id]);},
  save:()=>{calls.saves++;return true},
  flushBackup:async()=>{calls.backups++},
 };
 return {ctx,data,edits,calls};
}
test("palette uses only placeable canonical IDs",()=>{
 const r=registryFromBlocks(BLOCKS);
 assert.equal(r["edgeore:basalt"],3);assert.equal(r["edgeore:timber"],13);assert.equal(r["edgeore:bedrock"],undefined);
});
test("preflight rejects illegal palette and boundaries",()=>{
 const r=registryFromBlocks(BLOCKS);
 assert.throws(()=>compileBlueprint({...bp,palette:{B:"edgeore:bedrock"}},r,[10,8,10]),/Unrecognized/);
 assert.throws(()=>compileBlueprint(bp,r,[-1,8,10],{bounds:{minX:1,maxX:62,minY:1,maxY:22,minZ:1,maxZ:62}}),/bounds/);
});
test("valid blueprint persists only after write",async()=>{
 const h=context();const r=await placeIntoEdgeOre(bp,[10,8,10],h.ctx);
 assert.equal(r.blocks,2);assert.equal(r.backupOk,true);assert.equal(h.data.size,2);assert.equal(h.calls.saves,1);assert.equal(h.calls.backups,1);
});
test("occupied and protected zones reject without writing",async()=>{
 const h=context();h.data.set("10,8,10",13);
 await assert.rejects(placeIntoEdgeOre(bp,[10,8,10],h.ctx),/conflicts/);
 await assert.rejects(placeIntoEdgeOre(bp,[30,8,30],h.ctx),/Occupied/);
 assert.equal(h.calls.saves,0);
});
test("localStorage and backup failures are observable",async()=>{
 const h=context();h.ctx.save=()=>false;
 await assert.rejects(placeIntoEdgeOre(bp,[10,8,10],h.ctx),/Authoritative/);
 assert.equal(h.data.size,2);assert.equal(h.ctx.readBlock(10,8,10),0);
 const k=context();k.ctx.flushBackup=async()=>{throw Error("quota")};
 const result=await placeIntoEdgeOre(bp,[10,8,10],k.ctx);
 assert.equal(result.backupOk,false);assert.match(result.warning,/quota/);
 assert.equal(k.data.size,2);
});
