export const homePath = '/'

export function repertoirePath(id: string): string {
  return `/r/${encodeURIComponent(id)}`
}

export const openingsPath = '/openings'

export function openingPath(key: string): string {
  return `${openingsPath}/${encodeURIComponent(key)}`
}

export const learnPath = '/learn'

export function coursePath(id: string): string {
  return `${learnPath}/${encodeURIComponent(id)}`
}

export function lessonPath(id: string, depth: string, side: string): string {
  return `${coursePath(id)}/play?depth=${encodeURIComponent(depth)}&side=${encodeURIComponent(side)}`
}
