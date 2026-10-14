/** Presentation-only terminal capabilities: all tiers use the same verified read-only chain snapshot. */
export type TerminalDimension = "valley" | "geode" | "ember";
export type TerminalTier = 1 | 2 | 3;
export function terminalTier(dimension:TerminalDimension):TerminalTier {
 return dimension==="ember"?3:dimension==="geode"?2:1;
}
export type TerminalCapabilities = {tier:TerminalTier;board:boolean;historicalAnalytics:boolean;motherlode:boolean;simulation:boolean;canSign:false};
export function terminalCapabilities(dimension:TerminalDimension, hasVerifiedHistory=false):TerminalCapabilities {
 const tier=terminalTier(dimension);
 return {tier,board:true,historicalAnalytics:tier>=2&&hasVerifiedHistory,motherlode:tier>=3,simulation:false,canSign:false};
}
