import { describe, expect, it } from 'vitest'
import { homePath, repertoirePath } from './paths'

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
})
