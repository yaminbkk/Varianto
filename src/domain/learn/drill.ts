export const DRILL_DURATIONS_MS = [60_000, 180_000, 300_000] as const
export const DEFAULT_DRILL_MS = 180_000

export interface DrillState {
  /** Line keys in the order they are asked. */
  queue: readonly string[]
  /** Index of the line being played. */
  index: number
  passed: number
  failed: number
  startedAt: number
  durationMs: number
}

export interface DrillResult {
  passed: number
  failed: number
  durationMs: number
  elapsedMs: number
}

function shuffled(keys: string[]): string[] {
  const out = [...keys]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j] as string, out[i] as string]
  }
  return out
}

/** Starts a drill over the given line keys. `shuffle` is injectable so tests can fix the order. */
export function startDrill(
  keys: readonly string[],
  durationMs: number,
  startedAt: number,
  shuffle: (keys: string[]) => string[] = shuffled,
): DrillState {
  return { queue: shuffle([...keys]), index: 0, passed: 0, failed: 0, startedAt, durationMs }
}

/** The line to play now, or null when every line has been asked. */
export function currentKey(state: DrillState): string | null {
  return state.queue[state.index] ?? null
}

/** Records the outcome of the current line and moves to the next. */
export function recordLine(state: DrillState, passed: boolean): DrillState {
  return {
    ...state,
    index: state.index + 1,
    passed: state.passed + (passed ? 1 : 0),
    failed: state.failed + (passed ? 0 : 1),
  }
}

export function timeLeftMs(state: DrillState, now: number): number {
  return Math.max(0, state.startedAt + state.durationMs - now)
}

/** A drill ends when time runs out or every line has been asked. */
export function isOver(state: DrillState, now: number): boolean {
  return timeLeftMs(state, now) === 0 || currentKey(state) === null
}

export function drillResult(state: DrillState, now: number): DrillResult {
  return {
    passed: state.passed,
    failed: state.failed,
    durationMs: state.durationMs,
    elapsedMs: Math.min(state.durationMs, Math.max(0, now - state.startedAt)),
  }
}
