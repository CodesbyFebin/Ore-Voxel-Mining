/** Deterministic, allocation-light lighting profile. No simulation or chain state. */
export type SkyPreset = "clear" | "fair" | "overcast";
export interface AtmosphereProfile {
  sunAngle: number; daylight: number; golden: number;
  sunIntensity: number; ambientIntensity: number; fogDensity: number;
  exposure: number; skyTop: number; skyHorizon: number; fogColor: number;
}
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function atmosphereAt(hour:number,preset:SkyPreset="fair"):AtmosphereProfile {
 if(!Number.isFinite(hour))throw Error("Invalid time");
 const h=((hour%24)+24)%24;
 const angle=(h-6)/24*Math.PI*2;
 const altitude=Math.sin(angle);
 const daylight=clamp((altitude+0.12)/0.55);
 const golden=clamp(1-Math.abs(altitude-0.12)/0.3)*daylight;
 const clouds=preset==="overcast"?1:preset==="fair"?0.25:0;
 const exposure=0.78+daylight*0.33+golden*0.08;
 return {
  sunAngle:angle,daylight,golden,
  sunIntensity:(0.06+daylight*1.38)*(1-clouds*0.42),
  ambientIntensity:0.14+daylight*0.47*(1-clouds*0.2),
  fogDensity:0.027+clouds*0.022+(1-daylight)*0.006,
  exposure,
  skyTop:daylight>0.05?(golden>0.4?0x7790aa:clouds>0.6?0x687684:0x407ea7):0x061321,
  skyHorizon:daylight>0.05?(golden>0.4?0xffb56b:clouds>0.6?0xa4a2a0:0xb6e3ef):0x10243c,
  fogColor:daylight>0.05?(golden>0.4?0xd79a6e:clouds>0.6?0x737e87:0x608ca1):0x0b1a2b,
 };
}
export function advanceHour(hour:number,seconds:number,auto:boolean):number {
 if(!Number.isFinite(hour)||!Number.isFinite(seconds))throw Error("Invalid time");
 return auto?((hour+Math.max(0,seconds)*0.03)%24+24)%24:hour;
}
