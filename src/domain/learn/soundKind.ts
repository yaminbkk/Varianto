export type SoundKind = 'move' | 'capture' | 'castle' | 'check' | 'wrong' | 'finish'

/** Which sound a played move gets. Check beats capture, and capture beats a quiet move. */
export function soundKindFor(san: string): 'move' | 'capture' | 'castle' | 'check' {
  if (san.endsWith('+') || san.endsWith('#')) return 'check'
  if (san.startsWith('O-O')) return 'castle'
  if (san.includes('x')) return 'capture'
  return 'move'
}
