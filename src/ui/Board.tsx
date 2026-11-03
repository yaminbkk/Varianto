import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import type { Dests, Key } from 'chessground/types'
import { useEffect, useRef } from 'react'
import { legalDests, sideToMove } from '../domain/repertoire/squares'

export interface BoardProps {
  fen: string
  orientation: 'white' | 'black'
  canMove: boolean
  onMove: (from: string, to: string) => void
  /** Square to highlight as a hint, if any. */
  hint?: string | null
}

function configFor({ fen, orientation, canMove, hint }: BoardProps): Config {
  const turnColor = sideToMove(fen)
  return {
    fen,
    orientation,
    turnColor,
    viewOnly: !canMove,
    drawable: { autoShapes: hint ? [{ orig: hint as Key, brush: 'green' }] : [] },
    movable: {
      free: false,
      color: canMove ? turnColor : undefined,
      dests: canMove ? (legalDests(fen) as Dests) : new Map<Key, Key[]>(),
    },
  }
}

export default function Board(props: BoardProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Api | null>(null)
  // The latest props, read by the chessground callback that is registered only once.
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const api = Chessground(el, {
      ...configFor(propsRef.current),
      coordinates: true,
      draggable: { showGhost: true },
      highlight: { lastMove: false, check: false },
      movable: {
        ...configFor(propsRef.current).movable,
        showDests: true,
        events: { after: (from, to) => propsRef.current.onMove(from, to) },
      },
    })
    apiRef.current = api
    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [])

  const { fen, orientation, canMove, hint } = props
  useEffect(() => {
    apiRef.current?.set(configFor({ fen, orientation, canMove, hint, onMove: () => {} }))
  }, [fen, orientation, canMove, hint])

  return <div ref={elRef} className="board" role="group" aria-label="Chess board" />
}
