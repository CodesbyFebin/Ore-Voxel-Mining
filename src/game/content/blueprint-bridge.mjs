/** Validate all blueprint edits before the engine changes any voxels. */
export function compileBlueprint(raw, registry, origin, {bounds, protectedBoxes=[], isOccupied=()=>false, isReady=()=>true}={}) {
  if (!raw || typeof raw!=='object' || !Array.isArray(raw.size) || raw.size.length!==3 || !raw.size.every(n=>Number.isSafeInteger(n)&&n>0&&n<=16)) throw Error('Invalid size');
  const [w,h,d]=raw.size;
  if (w*h*d>4096 || !Array.isArray(raw.layers)||raw.layers.length!==h || !raw.palette||typeof raw.palette!=='object') throw Error('Invalid blueprint');
  if(!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isSafeInteger))throw Error('Invalid origin');
  const palette=Object.create(null);
  for(const [sym,name] of Object.entries(raw.palette)){
    if(sym.length!==1||sym==='.'||typeof name!=='string'||!Object.hasOwn(registry,name))throw Error(`Unrecognized palette entry ${sym}`);
    const id=registry[name];if(!Number.isSafeInteger(id)||id<1||id>255)throw Error('Invalid engine block ID');
    palette[sym]=id;
  }
  const patches=[],chunks=new Set(),seamNeighbors=new Set();
  for(let y=0;y<h;y++){
    const layer=raw.layers[y];if(typeof layer!=='string'||layer.length!==w*d)throw Error('Malformed schematic slice');
    for(let z=0;z<d;z++)for(let x=0;x<w;x++){
      const sym=layer[z*w+x];if(sym==='.')continue;
      if(!Object.hasOwn(palette,sym))throw Error(`Unknown schematic symbol ${sym}`);
      const [wx,wy,wz]=[origin[0]+x,origin[1]+y,origin[2]+z];
      if(![wx,wy,wz].every(Number.isSafeInteger))throw Error('Coordinate overflow');
      if(bounds&&(wx<bounds.minX||wx>bounds.maxX||wy<bounds.minY||wy>bounds.maxY||wz<bounds.minZ||wz>bounds.maxZ))throw Error('Out of world bounds');
      if(protectedBoxes.some(b=>wx>=b.minX&&wx<=b.maxX&&wy>=b.minY&&wy<=b.maxY&&wz>=b.minZ&&wz<=b.maxZ))throw Error('Protected structure or shaft');
      if(isOccupied(wx,wy,wz))throw Error('Occupied voxel');
      const cx=Math.floor(wx/16),cy=Math.floor(wy/16),cz=Math.floor(wz/16),key=JSON.stringify([cx,cy,cz]);
      if(!isReady(cx,cy,cz))throw Error('Target chunk is not READY');
      chunks.add(key);
      if(wx%16===0)seamNeighbors.add(JSON.stringify([cx-1,cy,cz]));
      if(wx%16===15)seamNeighbors.add(JSON.stringify([cx+1,cy,cz]));
      if(wy%16===0)seamNeighbors.add(JSON.stringify([cx,cy-1,cz]));
      if(wy%16===15)seamNeighbors.add(JSON.stringify([cx,cy+1,cz]));
      if(wz%16===0)seamNeighbors.add(JSON.stringify([cx,cy,cz-1]));
      if(wz%16===15)seamNeighbors.add(JSON.stringify([cx,cy,cz+1]));
      patches.push({x:wx,y:wy,z:wz,id:palette[sym],key});
    }
  }
  return {patches,chunks:[...chunks],invalidate:[...new Set([...chunks,...seamNeighbors])]};
}
