import { WX, WY, WZ, idx } from "./world.ts";
import { BLOCKS } from "./blocks.ts";
/** Lightweight minimap raster buffer. Rendering is left to the app UI. */
export function surfaceHeightmap(blocks:Uint8Array):Uint8Array{
  if(blocks.length!==WX*WY*WZ)throw new RangeError("Unexpected voxel buffer size");
  const out=new Uint8Array(WX*WZ);
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){
    let top=0;
    for(let y=WY-1;y>=0;y--)if(blocks[idx(x,y,z)]!==0){top=y+1;break;}
    out[x+z*WX]=top;
  }
  return out;
}
export function surfaceBlockIds(blocks:Uint8Array):Uint8Array{
  if(blocks.length!==WX*WY*WZ)throw new RangeError("Unexpected voxel buffer size");
  const ids=new Uint8Array(WX*WZ);
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){
    for(let y=WY-1;y>=0;y--){
      const block=blocks[idx(x,y,z)];
      if(block!==0){ids[x+z*WX]=block;break;}
    }
  }
  return ids;
}
export function minimapRgba(blockIds:Uint8Array):Uint8ClampedArray{
  if(blockIds.length!==WX*WZ)throw new RangeError("Unexpected minimap size");
  const rgba=new Uint8ClampedArray(WX*WZ*4);
  for(let i=0;i<blockIds.length;i++){
    const id=blockIds[i];const hex=BLOCKS[id]?.color??"#000000";
    const color=hex.startsWith("#")?hex.slice(1):"000000";
    const valid=/^[0-9a-fA-F]{6}$/.test(color);
    const raw=valid?parseInt(color,16):0;
    rgba[i*4]=(raw>>16)&255;rgba[i*4+1]=(raw>>8)&255;rgba[i*4+2]=raw&255;rgba[i*4+3]=255;
  }
  return rgba;
}
