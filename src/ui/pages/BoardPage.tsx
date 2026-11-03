import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { outlineRows, type OutlineRow } from '../../domain/repertoire/outline'
import { sanFromSquares } from '../../domain/repertoire/squares'
import { getNode } from '../../domain/repertoire/tree'
import Board from '../Board'
import { ILLEGAL_MOVE_MESSAGE, friendlyError } from '../messages'
import MoveList from '../MoveList'
import { homePath } from '../paths'
import SkipLink from '../SkipLink'
import { commentToFlush } from '../commentFlush'
import { SAVE_ERROR_MESSAGE, useAppStore, useStoreSnapshot } from '../useAppStore'

export default function BoardPage() {
  const { id = '' } = useParams()
  const current = useAppStore((s) => s.current)
  const selectedNodeId = useAppStore((s) => s.selectedNodeId)
  const error = useAppStore((s) => s.error)
  const saveError = useAppStore((s) => s.saveError)
  const open = useAppStore((s) => s.open)
  const playMove = useAppStore((s) => s.playMove)
  const selectNode = useAppStore((s) => s.selectNode)
  const deleteSelected = useAppStore((s) => s.deleteSelected)
  const setComment = useAppStore((s) => s.setComment)

  const commentId = useId()
  const mainRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const getState = useStoreSnapshot()

  const [loaded, setLoaded] = useState<{ id: string; failed: boolean } | null>(null)
  const [moveMessage, setMoveMessage] = useState<string | null>(null)
  // Changing the key remounts the board, which snaps a rejected drop back.
  const [boardKey, setBoardKey] = useState(0)

  useEffect(() => {
    let alive = true
    open(id).then(
      () => {
        if (alive) setLoaded({ id, failed: false })
      },
      () => {
        if (alive) setLoaded({ id, failed: true })
      },
    )
    return () => {
      alive = false
    }
  }, [id, open])

  const rep = current?.id === id ? current : null

  const rows = useMemo<OutlineRow[]>(() => {
    if (!rep) return []
    const start: OutlineRow = { nodeId: rep.rootId, depth: 0, label: 'Start position' }
    return [start, ...outlineRows(rep)]
  }, [rep])

  if (!rep || selectedNodeId === null || !(selectedNodeId in rep.nodes)) {
    const settled = loaded?.id === id
    return (
      <main id="main" className="app">
        <h1>Repertoire</h1>
        {settled ? (
          <>
            <p role="alert" className="alert">
              {loaded?.failed
                ? 'The repertoire could not be loaded. Check browser storage.'
                : 'Repertoire not found.'}
            </p>
            <p>
              <Link to={homePath}>Back to your repertoires</Link>
            </p>
          </>
        ) : (
          <p className="hint">Loading...</p>
        )}
      </main>
    )
  }

  const node = getNode(rep, selectedNodeId)
  const rootSelected = selectedNodeId === rep.rootId

  // Chessground cancels mousedown on the board, so the textarea may not blur.
  // Save a pending edit before anything changes the selection.
  function flushComment() {
    const { current: cur, selectedNodeId: sel } = getState()
    if (!cur || sel === null || !(sel in cur.nodes)) return
    const text = commentToFlush(getNode(cur, sel).comment, commentRef.current?.value)
    if (text !== null) void setComment(text)
  }

  function onMove(from: string, to: string) {
    const san = sanFromSquares(node.fen, from, to)
    if (san === null) {
      setMoveMessage(ILLEGAL_MOVE_MESSAGE)
      setBoardKey((k) => k + 1)
      return
    }
    setMoveMessage(null)
    flushComment()
    void playMove(san)
  }

  function onSelect(nodeId: string) {
    setMoveMessage(null)
    flushComment()
    selectNode(nodeId)
  }

  async function onDelete() {
    setMoveMessage(null)
    await deleteSelected()
    // The delete button disables itself, so hand focus to the newly selected move.
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus()
    })
  }

  const storeMessage = friendlyError(error)

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app app-wide">
        <p>
          <Link to={homePath}>Back to your repertoires</Link>
        </p>
        <h1>{rep.name}</h1>
        <p className="hint">Playing {rep.color === 'white' ? 'White' : 'Black'}</p>

        <div className="alerts" role="alert">
          {moveMessage && <p className="alert">{moveMessage}</p>}
          {storeMessage && storeMessage !== moveMessage && <p className="alert">{storeMessage}</p>}
          {saveError && <p className="alert">{SAVE_ERROR_MESSAGE}</p>}
        </div>

        <div className="board-layout">
          <div className="board-column">
            <Board key={boardKey} fen={node.fen} orientation={rep.color} canMove onMove={onMove} />
          </div>

          <div className="side-column">
            <section aria-labelledby="moves-heading">
              <h2 id="moves-heading">Moves</h2>
              <div ref={listRef}>
                <MoveList rows={rows} selectedId={selectedNodeId} onSelect={onSelect} />
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="btn"
                  disabled={rootSelected}
                  onClick={() => void onDelete()}
                >
                  Delete move
                </button>
              </div>
              {!rootSelected && (
                <p className="hint">Deleting a move also deletes every move after it.</p>
              )}
            </section>

            <section className="field" aria-labelledby="comment-heading">
              <h2 id="comment-heading">Comment</h2>
              <label htmlFor={commentId} className="visually-hidden">
                Comment for the selected position
              </label>
              <textarea
                key={selectedNodeId}
                id={commentId}
                ref={commentRef}
                rows={4}
                defaultValue={node.comment}
                onBlur={() => {
                  flushComment()
                }}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
