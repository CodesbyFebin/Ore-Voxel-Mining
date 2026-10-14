import test from "node:test";
import assert from "node:assert/strict";
import { blueprint, COMPUTE_STRUCTURES, planStructure } from "./compute-structures.ts";
import { generateWorld } from "./world.ts";
test("all compute structure blueprints are deterministic and bounded",()=>{
 for(const kind of Object.keys(COMPUTE_STRUCTURES) as Array<keyof typeof COMPUTE_STRUCTURES>){
  const b=blueprint(kind);assert.ok(b.length>30);assert.deepEqual(b,blueprint(kind));
  assert.equal(new Set(b.map(v=>[v.x,v.y,v.z].join(","))).size,b.length);
 }
});
test("placement never overwrites occupied world",()=>{
 const w=generateWorld(1,"valley");
 const result=planStructure(w,"embedding",{x:24,y:2,z:24},{x:0,y:0,z:0});
 assert.equal(result.ok,false);
});
