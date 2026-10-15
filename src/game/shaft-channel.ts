/** Small pure guards for the existing hold-P shaft; no signing or wallet access. */
export const SHAFT_COOLDOWN_MS = 2_000;
export const SHAFT_MOVE_TOLERANCE = 0.18;

export function canContinueShaftChannel(
  origin: { x: number; z: number } | null,
  position: { x: number; z: number },
  inRange: boolean,
  holding: boolean,
  hasItem: boolean,
  nowMs: number,
  readyAtMs: number,
): boolean {
  if (!origin || !inRange || !holding || !hasItem || nowMs < readyAtMs) return false;
  return Math.hypot(position.x - origin.x, position.z - origin.z) <= SHAFT_MOVE_TOLERANCE;
}
