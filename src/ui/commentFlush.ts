/** The comment text to save, or null when there is nothing pending. */
export function commentToFlush(saved: string, typed: string | undefined): string | null {
  return typed === undefined || typed === saved ? null : typed
}
