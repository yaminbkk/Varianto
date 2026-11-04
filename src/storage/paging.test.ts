import { describe, expect, it } from 'vitest'
import { fetchAllPages } from './paging'

function source(total: number) {
  const calls: [number, number][] = []
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to])
    const out: number[] = []
    for (let i = from; i <= Math.min(to, total - 1); i++) out.push(i)
    return out
  }
  return { calls, fetchPage }
}

describe('fetchAllPages', () => {
  it('reads past the server row limit by asking for page after page', async () => {
    const { fetchPage, calls } = source(2500)

    const rows = await fetchAllPages(fetchPage, 1000)

    expect(rows).toHaveLength(2500)
    expect(rows[0]).toBe(0)
    expect(rows[2499]).toBe(2499)
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('stops after one request when the first page is short', async () => {
    const { fetchPage, calls } = source(3)
    expect(await fetchAllPages(fetchPage, 1000)).toEqual([0, 1, 2])
    expect(calls).toHaveLength(1)
  })

  it('asks once more when the last page is exactly full', async () => {
    const { fetchPage, calls } = source(2000)
    expect(await fetchAllPages(fetchPage, 1000)).toHaveLength(2000)
    expect(calls).toHaveLength(3)
  })
})
