import { parseOpeningsTsv, sanSequence } from './parse.ts'
import type { OpeningLine } from './types.ts'

function rowLineNumbers(text: string): number[] {
  const numbers: number[] = []
  text.split('\n').forEach((raw, i) => {
    if (i > 0 && raw.replace(/\r$/, '').trim() !== '') numbers.push(i + 1)
  })
  return numbers
}

export function buildOpeningLibrary(files: { label: string; text: string }[]): OpeningLine[] {
  const firstSeen = new Map<string, string>()
  const all: OpeningLine[] = []

  for (const file of files) {
    const lines = parseOpeningsTsv(file.text, file.label)
    const lineNumbers = rowLineNumbers(file.text)
    lines.forEach((line, k) => {
      const location = `${file.label}:${lineNumbers[k]}`
      const key = `${line.eco}\u0000${line.name}\u0000${sanSequence(line.pgn)}`
      const earlier = firstSeen.get(key)
      if (earlier !== undefined) {
        throw new Error(
          `Duplicate opening ${line.eco} "${line.name}" at ${location} and ${earlier}`,
        )
      }
      firstSeen.set(key, location)
      all.push(line)
    })
  }

  return all.sort(
    (x, y) => compare(x.eco, y.eco) || compare(x.name, y.name) || compare(x.pgn, y.pgn),
  )
}

function compare(x: string, y: string): number {
  return x < y ? -1 : x > y ? 1 : 0
}
