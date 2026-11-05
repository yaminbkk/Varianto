import type { Evaluation } from './types'

/** Win percentage (0 to 100) for White from centipawns: the curve Lichess uses for its eval bar. */
function whiteWinPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

/** How much of the bar White fills, from 0 (Black wins) to 1 (White wins). */
export function barFill(e: Evaluation): number {
  switch (e.kind) {
    case 'cp':
      return whiteWinPercent(e.value) / 100
    case 'mate':
      return e.value > 0 ? 1 : 0
    case 'final':
      return e.result === 'white' ? 1 : e.result === 'black' ? 0 : 0.5
  }
}

function pawns(cp: number): string {
  const rounded = Math.round(Math.abs(cp) / 10) / 10
  if (rounded === 0) return '0.0'
  return `${cp > 0 ? '+' : '-'}${rounded.toFixed(1)}`
}

/** Short text for the bar: `+0.3`, `-1.2`, `M3`, `-M2`, `1-0`, `0-1`, `0.0`. */
export function evalLabel(e: Evaluation): string {
  switch (e.kind) {
    case 'cp':
      return pawns(e.value)
    case 'mate':
      return e.value > 0 ? `M${e.value}` : `-M${-e.value}`
    case 'final':
      return e.result === 'white' ? '1-0' : e.result === 'black' ? '0-1' : '0.0'
  }
}

/** A sentence for screen readers. */
export function describeEvaluation(e: Evaluation): string {
  switch (e.kind) {
    case 'cp': {
      const label = pawns(e.value)
      if (label === '0.0') return `Evaluation: equal (${label})`
      return `Evaluation: ${e.value > 0 ? 'White' : 'Black'} is ahead (${label})`
    }
    case 'mate':
      return `Evaluation: ${e.value > 0 ? 'White' : 'Black'} mates in ${Math.abs(e.value)}`
    case 'final':
      return e.result === 'draw'
        ? 'Evaluation: drawn'
        : `Evaluation: ${e.result === 'white' ? 'White' : 'Black'} won by checkmate`
  }
}
