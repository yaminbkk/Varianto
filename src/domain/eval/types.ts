/** An engine or rules-based verdict on a position, always from White's point of view. */
export type Evaluation =
  | { kind: 'cp'; value: number; depth: number }
  | { kind: 'mate'; value: number; depth: number }
  | { kind: 'final'; result: 'white' | 'black' | 'draw' }
