// Copies the Stockfish lite single-threaded engine into public/stockfish/ so the app can load
// it as a Web Worker. The files must be copied byte for byte: the engine finds its .wasm by name.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = join(root, 'node_modules', 'stockfish')
const out = join(root, 'public', 'stockfish')

const files = [
  ['bin/stockfish-19-lite-single.js', 'stockfish-19-lite-single.js'],
  ['bin/stockfish-19-lite-single.wasm', 'stockfish-19-lite-single.wasm'],
  ['Copying.txt', 'Copying.txt'],
]

mkdirSync(out, { recursive: true })
for (const [from, to] of files) {
  const source = join(pkg, from)
  if (!existsSync(source)) {
    console.error(`copy-stockfish: missing ${source}. Run "npm install" first.`)
    process.exit(1)
  }
  copyFileSync(source, join(out, to))
}
console.log(`copy-stockfish: copied ${files.length} files to public/stockfish`)
