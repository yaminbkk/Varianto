import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildOpeningLibrary } from '../src/domain/openings/build.ts'

const root = join(import.meta.dirname, '..')

try {
  const files = ['a', 'b', 'c', 'd', 'e'].map((letter) => ({
    label: `${letter}.tsv`,
    text: readFileSync(join(root, 'data', 'openings', `${letter}.tsv`), 'utf8'),
  }))
  const lines = buildOpeningLibrary(files)
  writeFileSync(join(root, 'src', 'data', 'openings.json'), JSON.stringify(lines, null, 2) + '\n')
  console.log(`${lines.length} openings written`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
