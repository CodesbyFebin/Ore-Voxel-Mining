/**
 * EdgeORE region scheduling, independently implemented from architectural ideas
 * described in PaperMC Folia's regionized server documentation.
 * No Paper/Folia code is copied. This is a client-side deterministic budget planner.
 */
export type RegionCoord = { cx: number; cz: number };
export type RegionJob = { key: string; cx: number; cz: number; priority: number; enqueueOrder: number };
export class RegionWorkQueue {
  private pending = new Map<string, RegionJob>();
  private counter = 0;
  private readonly maxPending: number;
  constructor(maxPending = 512) {
    if (!Number.isSafeInteger(maxPending) || maxPending < 1) throw new RangeError("maxPending must be a positive integer");
    this.maxPending = maxPending;
  }
  static key(cx: number, cz: number): string {
    if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cz)) throw new RangeError("Invalid region coordinates");
    return `${cx}:${cz}`;
  }
  enqueue(cx: number, cz: number, priority = 0): boolean {
    const key = RegionWorkQueue.key(cx, cz);
    if (!Number.isFinite(priority)) throw new RangeError("Invalid region priority");
    const existing = this.pending.get(key);
    if (existing) {
      existing.priority = Math.max(existing.priority, priority);
      return false;
    }
    if (this.pending.size >= this.maxPending) throw new Error("Region queue capacity exceeded");
    this.pending.set(key, { key, cx, cz, priority, enqueueOrder: this.counter++ });
    return true;
  }
  enqueueVoxelEdit(wx: number, wz: number, chunkSize = 16, priority = 0): void {
    if (![wx, wz].every(Number.isSafeInteger) || !Number.isSafeInteger(chunkSize) || chunkSize < 1) {
      throw new RangeError("Invalid edit coordinates");
    }
    const cx = Math.floor(wx / chunkSize), cz = Math.floor(wz / chunkSize);
    this.enqueue(cx, cz, priority);
    const lx = ((wx % chunkSize) + chunkSize) % chunkSize;
    const lz = ((wz % chunkSize) + chunkSize) % chunkSize;
    if (lx === 0) this.enqueue(cx - 1, cz, priority);
    if (lx === chunkSize - 1) this.enqueue(cx + 1, cz, priority);
    if (lz === 0) this.enqueue(cx, cz - 1, priority);
    if (lz === chunkSize - 1) this.enqueue(cx, cz + 1, priority);
  }
  drain(maxJobs: number): RegionCoord[] {
    if (!Number.isSafeInteger(maxJobs) || maxJobs < 0) throw new RangeError("Invalid job budget");
    const jobs = [...this.pending.values()].sort((a,b) => b.priority - a.priority || a.enqueueOrder - b.enqueueOrder).slice(0, maxJobs);
    for (const j of jobs) this.pending.delete(j.key);
    return jobs.map(({cx,cz}) => ({cx,cz}));
  }
  clear(): void { this.pending.clear(); }
  get size(): number { return this.pending.size; }
}
