const FAMILIES: Record<string, string> = {
  A: 'Flank openings (A)',
  B: 'Semi-open games (B)',
  C: 'Open games (C)',
  D: 'Closed games (D)',
  E: 'Indian defences (E)',
}

/** A readable label for the ECO letter of a code such as "C50". */
export function ecoFamily(eco: string): string {
  return FAMILIES[eco.charAt(0).toUpperCase()] ?? 'Other'
}
