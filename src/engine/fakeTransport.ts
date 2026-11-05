import type { EngineTransport } from './session'

/** An in-memory engine connection for tests: records what was sent and lets a test play the engine. */
export class FakeTransport implements EngineTransport {
  sent: string[] = []
  terminated = false
  private messageHandler: (line: string) => void = () => {}
  private errorHandler: (message: string) => void = () => {}

  post(command: string): void {
    this.sent.push(command)
  }

  onMessage(handler: (line: string) => void): void {
    this.messageHandler = handler
  }

  onError(handler: (message: string) => void): void {
    this.errorHandler = handler
  }

  terminate(): void {
    this.terminated = true
  }

  /** The engine says a line. */
  emit(line: string): void {
    this.messageHandler(line)
  }

  /** The worker fails. */
  fail(message: string): void {
    this.errorHandler(message)
  }
}
