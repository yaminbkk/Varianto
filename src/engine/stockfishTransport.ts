import type { EngineTransport } from './session'

/** The single-threaded lite build: ~1.8 MB, needs no special server headers. */
const ENGINE_FILE = 'stockfish/stockfish-19-lite-single.js'

/**
 * Starts Stockfish in a Web Worker. `baseUrl` is the site's base path (for example `/Varianto/`).
 * Throws when the browser cannot run WebAssembly.
 */
export function createStockfishTransport(baseUrl: string): EngineTransport {
  if (typeof WebAssembly === 'undefined') {
    throw new Error('WebAssembly is not supported in this browser')
  }
  const worker = new Worker(`${baseUrl}${ENGINE_FILE}`)
  return {
    post: (command) => worker.postMessage(command),
    onMessage: (handler) => {
      worker.onmessage = (event: MessageEvent) => handler(String(event.data))
    },
    onError: (handler) => {
      worker.onerror = (event: ErrorEvent) => handler(event.message || 'The engine failed to load')
    },
    terminate: () => worker.terminate(),
  }
}
