import { blueprint, type ComputeStructure } from "./compute-structures.ts";
import { block } from "./blocks.ts";

export type CraftCommandResult = { ok: true; kind: ComputeStructure } | { ok: false; reason: string };
const ALIASES: Array<[ComputeStructure, string[]]> = [
  ["embedding", ["embedding", "token pillars", "token memory"]],
  ["attention", ["attention", "five head", "multi head"]],
  ["arithmetic", ["arithmetic", "alu", "fixed point"]],
  ["memory", ["memory", "context", "64 slot"]],
];
export function parseCraftBuildCommand(raw: string): CraftCommandResult {
  const clean = raw.toLowerCase().trim().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");
  if (!clean || clean.length > 100) return { ok:false, reason:"Enter a short command such as: build attention hall." };
  const matches = ALIASES.flatMap(([kind, terms]) => terms.filter(term => clean.includes(term)).map(term => ({kind, term})));
  const longest = [...matches].sort((a,b) => b.term.length-a.term.length)[0];
  if (!longest) return { ok:false, reason:"Choose one supported design: embedding, attention, arithmetic, or memory." };
  // Multiple independent design names are ambiguous. A specific phrase such as
  // "token memory" may legitimately contain a shorter alias "memory".
  const conflicts = matches.some(match => match.kind !== longest.kind && !longest.term.includes(match.term));
  if (conflicts) return { ok:false, reason:"Choose just one design: embedding, attention, arithmetic, or memory." };
  return { ok:true, kind:longest.kind };
}
export function craftBlueprintSummary(kind: ComputeStructure) {
  const voxels=blueprint(kind);
  const top = new Map<string, { y:number; id:number }>();
  const counts = new Map<number, number>();
  for (const v of voxels) {
    counts.set(v.id, (counts.get(v.id) ?? 0)+1);
    const key=`${v.x},${v.z}`,old=top.get(key);
    if(!old||v.y>=old.y)top.set(key,{y:v.y,id:v.id});
  }
  const glyphs: Record<number,string>={3:"#",5:"C",8:"G",11:"*",16:"A"};
  const rows:string[]=[];
  for(let z=-5;z<=5;z++){let line="";for(let x=-5;x<=5;x++){const v=top.get(`${x},${z}`);line+=v?(glyphs[v.id]??"B"):" ";}rows.push(line);}
  return {total:voxels.length,preview:rows.join("\n"),materials:[...counts].map(([id,count])=>`${block(id).name} ×${count}`).join(" · ")};
}
