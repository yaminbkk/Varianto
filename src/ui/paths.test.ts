import { describe, expect, it } from 'vitest'
import { homePath, openingPath, openingsPath, repertoirePath } from './paths'

describe('route paths', () => {
  it('has a home path', () => {
    expect(homePath).toBe('/')
  })

  it('builds a repertoire path', () => {
    expect(repertoirePath('abc')).toBe('/r/abc')
  })

  it('encodes ids that contain reserved characters', () => {
    expect(repertoirePath('a b/c')).toBe('/r/a%20b%2Fc')
  })

  it('has an openings list path and builds an opening path', () => {
    expect(openingsPath).toBe('/openings')
    expect(openingPath('c50-italian-game')).toBe('/openings/c50-italian-game')
  })
})
