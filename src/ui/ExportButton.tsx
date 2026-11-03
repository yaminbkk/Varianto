import { pgnFileName } from '../domain/pgn/filename'
import { exportPgn } from '../domain/pgn/pgn'
import type { Repertoire } from '../domain/repertoire/tree'

export default function ExportButton({ rep }: { rep: Repertoire }) {
  function onExport() {
    const blob = new Blob([exportPgn(rep)], { type: 'application/x-chess-pgn' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pgnFileName(rep.name)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" className="btn" onClick={onExport}>
      Export PGN
    </button>
  )
}
