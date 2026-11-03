import { describe, expect, it } from 'vitest'
import {
  coursePath,
  drillPath,
  homePath,
  learnPath,
  lessonPath,
  openingPath,
  openingsPath,
  practicePath,
  repertoirePath,
} from './paths'

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

  it('builds learn paths', () => {
    expect(learnPath).toBe('/learn')
    expect(coursePath('italian-game')).toBe('/learn/italian-game')
    expect(lessonPath('italian-game', 'advanced', 'black')).toBe(
      '/learn/italian-game/play?depth=advanced&side=black',
    )
  })

  it('builds practice and drill paths, encoding the course id', () => {
    expect(practicePath('italian-game')).toBe('/learn/italian-game/practice')
    expect(drillPath('italian-game')).toBe('/learn/italian-game/drill')
    expect(drillPath('a b')).toBe('/learn/a%20b/drill')
  })
})
