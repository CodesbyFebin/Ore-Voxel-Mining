/** Browser-only durable chunk snapshots. The legacy save remains authoritative
 * until a future explicitly versioned restore/migration is implemented.
 */
export const CHUNK_EDGE = 16;
export const CHUNK_VOLUME = CHUNK_EDGE ** 3;
export type ChunkRecordInput = { world: string; x: number; y: number; z: number; blockIds: Uint8Array };
type StoredChunk = { key: string; world: string; x: number; y: number; z: number; codec: "deflate" | "raw"; data: ArrayBuffer; modifiedAt: number; format: 1 };
const KEY = (w:string,x:number,y:number,z:number)=>JSON.stringify([w,x,y,z]);
function validate(c:ChunkRecordInput) {
 if (!c.world || c.world.length > 128 || ![c.x,c.y,c.z].every(Number.isSafeInteger) || c.blockIds.length!==CHUNK_VOLUME)
  throw new Error("Invalid 16-cubed chunk");
}
async function encode(bytes:Uint8Array):Promise<{codec:"deflate"|"raw";data:ArrayBuffer}> {
 if(typeof CompressionStream === "undefined")return {codec:"raw",data:Uint8Array.from(bytes).buffer};
 const stream=new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new CompressionStream("deflate"));
 return {codec:"deflate",data:await new Response(stream).arrayBuffer()};
}
async function decode(record:StoredChunk):Promise<Uint8Array>{
 const output=record.codec==="raw"?record.data:await new Response(new Blob([record.data]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
 if(output.byteLength!==CHUNK_VOLUME)throw new Error("Invalid stored chunk payload length");
 return new Uint8Array(output);
}
export class IndexedDBChunkStorage{
 private db:IDBDatabase|null=null;
 constructor(private readonly dbName="edgeore-world-chunks-v1"){}
 async init():Promise<void>{
  if(this.db)return;
  if(typeof indexedDB==="undefined")throw new Error("IndexedDB unavailable");
  this.db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const request=indexedDB.open(this.dbName,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("chunks"))request.result.createObjectStore("chunks",{keyPath:"key"});};
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error??new Error("IndexedDB open failed"));
   request.onblocked=()=>reject(new Error("IndexedDB upgrade blocked by another tab"));
  });
  this.db.onversionchange=()=>{this.db?.close();this.db=null;};
 }
 async saveChunksBatch(chunks:ChunkRecordInput[]):Promise<void>{
  if(!chunks.length)return;
  for(const c of chunks)validate(c);
  await this.init();
  const records:StoredChunk[]=await Promise.all(chunks.map(async c=>{
   const encoded=await encode(c.blockIds);
   return {key:KEY(c.world,c.x,c.y,c.z),world:c.world,x:c.x,y:c.y,z:c.z,format:1,modifiedAt:Date.now(),...encoded};
  }));
  await new Promise<void>((resolve,reject)=>{
   const tx=this.db!.transaction("chunks","readwrite");
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error("Chunk write aborted"));tx.onerror=()=>reject(tx.error??new Error("Chunk write failed"));
   const store=tx.objectStore("chunks");
   for(const record of records)store.put(record);
  });
 }
 async loadChunk(world:string,x:number,y:number,z:number):Promise<Uint8Array|null>{
  await this.init();
  const record=await new Promise<StoredChunk|undefined>((resolve,reject)=>{
   const tx=this.db!.transaction("chunks","readonly");const request=tx.objectStore("chunks").get(KEY(world,x,y,z));
   request.onsuccess=()=>resolve(request.result as StoredChunk|undefined);
   request.onerror=()=>reject(request.error??new Error("Chunk read failed"));
  });
  return record?decode(record):null;
 }
 async deleteChunk(world:string,x:number,y:number,z:number):Promise<void>{
  await this.init();
  await new Promise<void>((resolve,reject)=>{
   const tx=this.db!.transaction("chunks","readwrite");
   tx.objectStore("chunks").delete(KEY(world,x,y,z));
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error("Delete aborted"));tx.onerror=()=>reject(tx.error??new Error("Delete failed"));
  });
 }
 async requestPersistence():Promise<boolean>{
  return typeof navigator!=="undefined"&&!!navigator.storage?.persist?navigator.storage.persist():false;
 }
 close(){this.db?.close();this.db=null;}
}
