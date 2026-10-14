import test from "node:test";
import assert from "node:assert/strict";
import { planActiveChunks } from "./streaming-plan.ts";
import { cubicChunkKey } from "../vertical-strata.ts";
import { terminalCapabilities } from "../../ore/terminal-tiers.ts";
test("streaming planner handles signed chunk boundaries without duplicate loads",()=>{
 const atOrigin=planActiveChunks({x:15.5,y:-1,z:0},new Set(),1,0);
 assert.equal(atOrigin.center.cx,0);
 assert.equal(atOrigin.center.cy,-1);
 assert.equal(atOrigin.load.length,9);
 assert.equal(atOrigin.load[0].cx,0);
 const active=new Set(atOrigin.load.map(p=>cubicChunkKey(p.cx,p.cy,p.cz)));
 const moved=planActiveChunks({x:16.1,y:-1,z:0},active,1,0);
 assert.equal(moved.center.cx,1);
 assert.equal(moved.load.length,3);
 assert.equal(moved.unload.length,3);
});
test("terminal tiers never grant signing or fake analytics",()=>{
 assert.equal(terminalCapabilities("valley").tier,1);
 assert.equal(terminalCapabilities("geode").historicalAnalytics,false);
 assert.equal(terminalCapabilities("ember").motherlode,true);
 for(const dim of ["valley","geode","ember"] as const){
  assert.equal(terminalCapabilities(dim).canSign,false);
  assert.equal(terminalCapabilities(dim).simulation,false);
 }
});
