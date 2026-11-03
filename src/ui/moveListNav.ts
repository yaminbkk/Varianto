import type { OutlineRow } from '../domain/repertoire/outline'

/**
 * The row the selection should move to for an Up or Down arrow key, clamped to
 * the list ends. Returns null for other keys or when `currentId` is not listed.
 */
export function neighborNodeId(rows: OutlineRow[], currentId: string, key: string): string | null {
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return null
  const index = rows.findIndex((r) => r.nodeId === currentId)
  if (index === -1) return null
  const next = key === 'ArrowDown' ? Math.min(index + 1, rows.length - 1) : Math.max(index - 1, 0)
  return rows[next]?.nodeId ?? null
}
