import { compileBlueprint } from './blueprint-bridge.mjs';
import { registryFromBlocks } from './registry.mjs';
export async function placeIntoEdgeOre(raw, origin, context) {
  const {BLOCKS,WX,WY,WZ,shaft,player,terminal,vault,portals=[],machines=[],readBlock,writeBlock,save,flushBackup}=context;
  const isProtected=(x,y,z)=>{
    if(Math.hypot(x-shaft.x,z-shaft.z)<=3)return true;
    if(Math.abs(x-terminal.x)<=2&&Math.abs(z-terminal.z)<=2)return true;
    if(Math.abs(x-vault.x)<=2&&Math.abs(z-vault.z)<=2)return true;
    if(portals.some(p=>Math.hypot(x-p.x,z-p.z)<=3))return true;
    if(machines.some(m=>Math.abs(x-m.x)<=1&&Math.abs(y-m.y)<=2&&Math.abs(z-m.z)<=1))return true;
    return Math.abs(x-player.x)<1.3&&Math.abs(y-player.y)<2.1&&Math.abs(z-player.z)<1.3;
  };
  const plan=compileBlueprint(raw,registryFromBlocks(BLOCKS),origin,{
    bounds:{minX:1,maxX:WX-2,minY:1,maxY:WY-2,minZ:1,maxZ:WZ-2},isOccupied:isProtected,
  });
  if(!plan.patches.length)throw Error('Blueprint contains no solid blocks');
  for(const p of plan.patches)if(readBlock(p.x,p.y,p.z)!==0)throw Error('Placement conflicts with an existing block');
  const before=[];
  try {
    for(const p of plan.patches){before.push({...p,previous:readBlock(p.x,p.y,p.z)});writeBlock(p.x,p.y,p.z,p.id);}
  }catch(e){
    for(const p of before.reverse())writeBlock(p.x,p.y,p.z,p.previous);
    throw e;
  }
  if(save()===false)throw Error('Authoritative localStorage save failed');
  await flushBackup();
  return {blocks:plan.patches.length,chunks:plan.chunks.length,invalidated:plan.invalidate.length};
}
