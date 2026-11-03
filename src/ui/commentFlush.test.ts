import { describe, expect, it } from 'vitest'
import { commentToFlush } from './commentFlush'

describe('commentToFlush', () => {
  it('returns the typed text when it differs from the saved comment', () => {
    expect(commentToFlush('old', 'new')).toBe('new')
  })

  it('returns null when the text is unchanged', () => {
    expect(commentToFlush('same', 'same')).toBeNull()
  })

  it('returns an empty string when the comment was cleared', () => {
    expect(commentToFlush('old', '')).toBe('')
  })

  it('returns null when there is no textarea value', () => {
    expect(commentToFlush('old', undefined)).toBeNull()
  })
})
