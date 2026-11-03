import { describe, expect, it } from 'vitest'
import type { OutlineRow } from '../domain/repertoire/outline'
import { neighborNodeId } from './moveListNav'

const rows: OutlineRow[] = [
  { nodeId: 'a', depth: 0, label: '1. e4' },
  { nodeId: 'b', depth: 0, label: '1... e5' },
  { nodeId: 'c', depth: 1, label: '1... c5' },
]

describe('neighborNodeId', () => {
  it('moves down to the next row', () => {
    expect(neighborNodeId(rows, 'a', 'ArrowDown')).toBe('b')
  })

  it('moves up to the previous row', () => {
    expect(neighborNodeId(rows, 'c', 'ArrowUp')).toBe('b')
  })

  it('stays on the first row when moving up from it', () => {
    expect(neighborNodeId(rows, 'a', 'ArrowUp')).toBe('a')
  })

  it('stays on the last row when moving down from it', () => {
    expect(neighborNodeId(rows, 'c', 'ArrowDown')).toBe('c')
  })

  it('returns null for other keys', () => {
    expect(neighborNodeId(rows, 'a', 'Enter')).toBeNull()
  })

  it('returns null when the id is not in the list', () => {
    expect(neighborNodeId(rows, 'zzz', 'ArrowDown')).toBeNull()
  })
})
