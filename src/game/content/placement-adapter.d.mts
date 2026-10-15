export function placeIntoEdgeOre(raw: unknown, origin: [number,number,number], context: {
  BLOCKS: unknown; WX: number; WY: number; WZ: number; seed?: number;
  shaft: {x:number;z:number}; player:{x:number;y:number;z:number};
  terminal:{x:number;z:number}; vault:{x:number;z:number};
  portals: Array<{x:number;z:number}>; machines:Array<{x:number;y:number;z:number}>;
  readBlock:(x:number,y:number,z:number)=>number;
  writeBlock:(x:number,y:number,z:number,id:number)=>void;
  save:()=>boolean;
  flushBackup:()=>Promise<void>;
}): Promise<{blocks:number;chunks:number;invalidated:number;backupOk:boolean;warning?:string}>;
