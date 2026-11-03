export const homePath = '/'

export function repertoirePath(id: string): string {
  return `/r/${encodeURIComponent(id)}`
}
