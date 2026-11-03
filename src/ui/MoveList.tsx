import { useRef, type KeyboardEvent } from 'react'
import type { OutlineRow } from '../domain/repertoire/outline'
import { neighborNodeId } from './moveListNav'

export interface MoveListProps {
  rows: OutlineRow[]
  selectedId: string | null
  onSelect: (nodeId: string) => void
}

export default function MoveList({ rows, selectedId, onSelect }: MoveListProps) {
  const buttons = useRef(new Map<string, HTMLButtonElement>())

  // Roving tabindex: the list is one Tab stop, and arrow keys move within it.
  const stopId = rows.some((r) => r.nodeId === selectedId) ? selectedId : rows[0]?.nodeId

  function onKeyDown(e: KeyboardEvent, nodeId: string) {
    const next = neighborNodeId(rows, nodeId, e.key)
    if (next === null) return
    e.preventDefault()
    onSelect(next)
    buttons.current.get(next)?.focus()
  }

  return (
    <ul className="move-list" aria-label="Moves">
      {rows.map((row) => (
        <li key={row.nodeId}>
          <button
            type="button"
            ref={(el) => {
              if (el) buttons.current.set(row.nodeId, el)
              else buttons.current.delete(row.nodeId)
            }}
            className={row.depth > 0 ? 'move move-variation' : 'move'}
            style={{ paddingInlineStart: `${0.75 + row.depth * 1.25}rem` }}
            tabIndex={row.nodeId === stopId ? 0 : -1}
            aria-current={row.nodeId === selectedId ? 'true' : undefined}
            onClick={() => onSelect(row.nodeId)}
            onKeyDown={(e) => onKeyDown(e, row.nodeId)}
          >
            {row.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
