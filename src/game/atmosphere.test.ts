import test from "node:test";
import assert from "node:assert/strict";
import { atmosphereAt, advanceHour } from "./atmosphere.ts";
test("sky state is deterministic and bounded",()=>{
 assert.deepEqual(atmosphereAt(18,"fair"),atmosphereAt(18,"fair"));
 for(const h of [0,6,8,12,18,22,24]){const p=atmosphereAt(h);assert.ok(p.daylight>=0&&p.daylight<=1);assert.ok(p.fogDensity>0);assert.ok(p.exposure>0);}
});
test("overcast increases fog; auto day cycle is opt-in",()=>{
 assert.ok(atmosphereAt(12,"overcast").fogDensity>atmosphereAt(12,"clear").fogDensity);
 assert.equal(advanceHour(8,60,false),8);
 assert.ok(advanceHour(8,60,true)>8);
});
