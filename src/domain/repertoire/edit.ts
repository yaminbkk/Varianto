import type { Color, Repertoire } from './tree'

const DEFAULT_NAME = 'Untitled repertoire'

export function renameRepertoire(rep: Repertoire, name: string): Repertoire {
  const trimmed = name.trim()
  return { ...rep, name: trimmed === '' ? DEFAULT_NAME : trimmed }
}

export function setRepertoireColor(rep: Repertoire, color: Color): Repertoire {
  return { ...rep, color }
}
