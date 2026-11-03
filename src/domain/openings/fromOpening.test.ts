import { describe, expect, it } from 'vitest'
import { getNode } from '../repertoire/tree'
import { repertoireFromOpening } from './fromOpening'
import type { OpeningLine } from './types'

const line: OpeningLine = { eco: 'A00', name: 'Amar Opening', pgn: '1. Nh3 d5' }

function sequentialIds() {
  let i = 0
  return () => `id${++i}`
}

describe('repertoireFromOpening', () => {
  it("names the repertoire after the opening and imports the line's moves", () => {
    const rep = repertoireFromOpening(line, 'white', sequentialIds())

    expect(rep.name).toBe('Amar Opening')
    const root = getNode(rep, rep.rootId)
    expect(root.childIds).toHaveLength(1)
    expect(getNode(rep, root.childIds[0] ?? '').san).toBe('Nh3')
  })

  it('throws when the movetext is invalid', () => {
    expect(() =>
      repertoireFromOpening({ ...line, pgn: '1. Zz9' }, 'white', sequentialIds()),
    ).toThrow()
  })
})
