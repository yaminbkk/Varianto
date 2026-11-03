import { describe, expect, it } from 'vitest'
import { renameRepertoire, setRepertoireColor } from './edit'
import { createRepertoire } from './tree'

describe('renameRepertoire', () => {
  it('trims the new name', () => {
    const rep = createRepertoire('Old', 'white')
    expect(renameRepertoire(rep, '  Sicilian  ').name).toBe('Sicilian')
  })

  it('falls back to a default name when the name is blank', () => {
    const rep = createRepertoire('Old', 'white')
    expect(renameRepertoire(rep, '   ').name).toBe('Untitled repertoire')
  })

  it('does not mutate the input', () => {
    const rep = createRepertoire('Old', 'white')
    renameRepertoire(rep, 'New')
    expect(rep.name).toBe('Old')
  })
})

describe('setRepertoireColor', () => {
  it('changes the color and keeps the same nodes', () => {
    const rep = createRepertoire('Test', 'white')
    const recolored = setRepertoireColor(rep, 'black')
    expect(recolored.color).toBe('black')
    expect(recolored.nodes).toBe(rep.nodes)
    expect(rep.color).toBe('white')
  })
})
