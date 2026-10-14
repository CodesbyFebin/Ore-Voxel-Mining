/** Future continuous vertical-world coordinate system. The currently playable
 * portal dimensions remain separate until the streaming world migration.
 */
export const STRATUM_MIN_Y = -64;
export const STRATUM_MAX_Y = 128; // exclusive
export const STRATUM_CHUNK_EDGE = 16;
export type StratumId = "valley" | "geode" | "ember";
export function floorChunkCoordinate(blockCoordinate: number): number {
 if (!Number.isSafeInteger(blockCoordinate)) throw new RangeError("Block coordinate must be a safe integer");
 return Math.floor(blockCoordinate / STRATUM_CHUNK_EDGE);
}
export function localVoxelCoordinate(blockCoordinate:number):number {
 return ((blockCoordinate%STRATUM_CHUNK_EDGE)+STRATUM_CHUNK_EDGE)%STRATUM_CHUNK_EDGE;
}
export function stratumFromY(y:number):StratumId {
 if(!Number.isFinite(y)||y<STRATUM_MIN_Y||y>=STRATUM_MAX_Y)throw new RangeError("Y outside planned vertical world");
 return y>=64?"valley":y>=0?"geode":"ember";
}
export function stratumFromChunkY(cy:number):StratumId {
 if(!Number.isSafeInteger(cy)||cy < -4||cy>7)throw new RangeError("Chunk Y outside planned vertical world");
 return cy>=4?"valley":cy>=0?"geode":"ember";
}
export function cubicChunkKey(cx:number,cy:number,cz:number):string {
 if(![cx,cy,cz].every(Number.isSafeInteger))throw new RangeError("Invalid chunk key coordinate");
 return JSON.stringify([cx,cy,cz]);
}
