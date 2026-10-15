import test from "node:test";
import assert from "node:assert/strict";
import { parseCraftBuildCommand, craftBlueprintSummary } from "./craftgpt-ui.ts";
test("parses four safe structure commands",()=>{
 for(const [command,kind] of [["build attention hall","attention"],["create alu","arithmetic"],["build token memory","embedding"],["build context","memory"]] as const)
   assert.deepEqual(parseCraftBuildCommand(command),{ok:true,kind});
});
test("rejects unsupported or ambiguous prompts",()=>{
 assert.equal(parseCraftBuildCommand("build a giant castle").ok,false);
 assert.equal(parseCraftBuildCommand("attention arithmetic").ok,false);
});
test("preview is deterministic and counts actual voxels",()=>{
 const a=craftBlueprintSummary("attention");
 assert.equal(a.preview.split("\n").length,11);
 assert.ok(a.total>121);
 assert.deepEqual(a,craftBlueprintSummary("attention"));
});
