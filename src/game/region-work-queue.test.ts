import assert from "node:assert/strict";
import test from "node:test";
import { RegionWorkQueue } from "./region-work-queue.ts";

test("deduplicates region jobs and keeps FIFO within priority", () => {
  const q = new RegionWorkQueue();
  assert.equal(q.enqueue(0,0), true);
  assert.equal(q.enqueue(0,0), false);
  q.enqueue(1,0); q.enqueue(2,0,10);
  assert.deepEqual(q.drain(2), [{cx:2,cz:0},{cx:0,cz:0}]);
  assert.deepEqual(q.drain(9), [{cx:1,cz:0}]);
});
test("only seam-neighbor regions are dirtied", () => {
  const q = new RegionWorkQueue();
  q.enqueueVoxelEdit(16,31);
  assert.deepEqual(q.drain(10), [{cx:1,cz:1},{cx:0,cz:1},{cx:1,cz:2}]);
});
test("negative coordinates and bounded budgets", () => {
  const q = new RegionWorkQueue(5);
  q.enqueueVoxelEdit(-16,-16);
  assert.equal(q.size,3);
  assert.equal(q.drain(1).length,1);
  assert.equal(q.size,2);
  assert.throws(() => q.enqueue(1.5,0), RangeError);
  assert.throws(() => q.drain(-1), RangeError);
});
