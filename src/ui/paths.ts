export const homePath = '/'

export function repertoirePath(id: string): string {
  return `/r/${encodeURIComponent(id)}`
}

export const openingsPath = '/openings'

export function openingPath(key: string): string {
  return `${openingsPath}/${encodeURIComponent(key)}`
}
