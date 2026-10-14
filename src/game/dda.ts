export type VoxelHit = {
  x: number;
  y: number;
  z: number;
  blockType: number;
  faceNormal: { x: number; y: number; z: number };
  distance: number;
};

/**
 * Grid DDA. Work is one step per crossed cell, not per mesh triangle.
 * A zero direction misses. The cell the ray starts in is tested first.
 * The face normal points back toward the cell the ray came from.
 */
export function traceVoxel(
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDistance: number,
  blockAt: (x: number, y: number, z: number) => number,
  size: { x: number; y: number; z: number },
): VoxelHit | null {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!length || !Number.isFinite(length)) return null;
  const dir = [direction.x / length, direction.y / length, direction.z / length];
  const pos = [origin.x, origin.y, origin.z];
  const cell = pos.map((value) => Math.floor(value));
  const step = dir.map((value) => Math.sign(value));
  const delta = dir.map((value) => (value === 0 ? Infinity : Math.abs(1 / value)));
  const tmax = dir.map((value, i) => (value === 0 ? Infinity : ((step[i] > 0 ? cell[i] + 1 : cell[i]) - pos[i]) / value));
  let distance = 0;
  let normal = [0, 0, 0];
  for (let n = 0; n < 48 && distance <= maxDistance; n++) {
    const [x, y, z] = cell;
    if (x >= 0 && x < size.x && y >= 0 && y < size.y && z >= 0 && z < size.z) {
      const blockType = blockAt(x, y, z);
      if (blockType !== 0) {
        return { x, y, z, blockType, faceNormal: { x: normal[0], y: normal[1], z: normal[2] }, distance };
      }
    }
    let axis = 0;
    if (tmax[1] < tmax[axis]) axis = 1;
    if (tmax[2] < tmax[axis]) axis = 2;
    distance = tmax[axis];
    if (distance > maxDistance) break;
    cell[axis] += step[axis];
    normal = [0, 0, 0];
    normal[axis] = -step[axis];
    tmax[axis] += delta[axis];
  }
  return null;
}
