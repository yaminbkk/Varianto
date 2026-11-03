export const ILLEGAL_MOVE_MESSAGE = 'That move is not legal in this position.'

/** Replaces domain errors that embed internal details (such as a FEN) with plain text. */
export function friendlyError(message: string | null): string | null {
  if (message !== null && message.startsWith('Illegal move ')) return ILLEGAL_MOVE_MESSAGE
  return message
}
