/** Moves a step index by delta, clamped to 0..total (0 is the start position). */
export function stepBy(step: number, delta: number, total: number): number {
  return Math.min(total, Math.max(0, step + delta))
}
