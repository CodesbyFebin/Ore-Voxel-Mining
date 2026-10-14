import { useEffect, useState } from "react";
type Book={credits:number;ore:number;staked:number;events:string[]};
const KEY="edgeore-sandbox-market-v1";
const initial:Book={credits:1000,ore:0,staked:0,events:[]};
const PRICE=25;
export function SandboxMarket({onClose}:{onClose:()=>void}){
 const [book,setBook]=useState<Book>(()=>{try{const j=JSON.parse(localStorage.getItem(KEY)||"null");return j&&[j.credits,j.ore,j.staked].every((n:unknown)=>typeof n==="number"&&Number.isFinite(n)&&n>=0)?{credits:j.credits,ore:j.ore,staked:j.staked,events:Array.isArray(j.events)?j.events.slice(0,12):[]}:initial}catch{return initial}});
 const [amount,setAmount]=useState("1");
 const [error,setError]=useState("");
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(book))}catch{}},[book]);
 function action(type:"buy"|"sell"|"stake"|"unstake"){
  const a=Number(amount);
  if(!Number.isSafeInteger(a)||a<1||a>100000){setError("Enter a positive whole-number amount.");return}
  const next={...book,events:[...book.events]};
  if(type==="buy"){if(next.credits<a*PRICE){setError("Insufficient demo credits.");return}next.credits-=a*PRICE;next.ore+=a}
  if(type==="sell"){if(next.ore<a){setError("Insufficient demo ORE.");return}next.ore-=a;next.credits+=a*PRICE}
  if(type==="stake"){if(next.ore<a){setError("Insufficient demo ORE.");return}next.ore-=a;next.staked+=a}
  if(type==="unstake"){if(next.staked<a){setError("Insufficient staked demo ORE.");return}next.staked-=a;next.ore+=a}
  next.events=[`${type.toUpperCase()} ${a} demo ORE`,...next.events].slice(0,12);setBook(next);setError("");
 }
 return <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" aria-label="Demo trading and staking">
  <div className="rounded-xl border border-cyan/30 bg-cyan/5 p-3 text-sm"><strong>SIMULATION ONLY</strong><p className="mt-1 text-xs text-muted">These demo balances are not cryptocurrency, cannot be withdrawn, and do not earn real staking yield. Fixed test price: 25 demo credits per demo ORE. No wallet signatures, network orders, or smart contracts.</p></div>
  <div className="mt-4 grid grid-cols-3 gap-2 text-center">{([["Credits",book.credits],["Demo ORE",book.ore],["Staked",book.staked]] as const).map(([label,val])=><div className="rounded-xl border border-line bg-surface p-3" key={label}><div className="text-[10px] uppercase text-muted">{label}</div><div className="font-mono text-lg text-mint">{val}</div></div>)}</div>
  <label className="mt-5 block text-xs font-bold text-fg" htmlFor="sandbox-amount">Demo ORE quantity</label>
  <input id="sandbox-amount" className="mt-2 w-full rounded-lg border border-line bg-bg p-3 text-fg" type="number" min="1" max="100000" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/>
  <div className="mt-3 grid grid-cols-2 gap-2">{(["buy","sell","stake","unstake"] as const).map(a=><button type="button" className="rounded-lg border border-mint/40 bg-surface p-3 text-sm font-bold uppercase text-mint hover:bg-mint/10" key={a} onClick={()=>action(a)}>{a} demo ORE</button>)}</div>
  {error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  <div className="mt-5 flex items-center justify-between"><h3 className="text-xs font-bold uppercase text-muted">Local demo activity</h3><button className="text-xs text-cyan underline" type="button" onClick={()=>{setBook(initial);setError("")}}>Reset sandbox</button></div>
  <ul className="mt-2 space-y-1 font-mono text-xs text-muted">{book.events.length?book.events.map((e,i)=><li key={i}>{e}</li>):<li>No simulated transactions yet.</li>}</ul>
  <button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-mint p-3 font-bold text-bg">Return to ORE grid</button>
 </section>
}
