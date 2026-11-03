import { slug } from '../openings/key'
import type { Course } from './courses'

/** A variation needs this many lines to get a course of its own. */
export const MIN_VARIANT_LINES = 3

/** The variation an opening name belongs to: the text after the first colon, up to the next comma or colon. */
export function variationName(openingName: string): string | null {
  const colon = openingName.indexOf(':')
  if (colon < 0) return null
  const head = (openingName.slice(colon + 1).split(/[,:]/)[0] ?? '').trim()
  return head === '' ? null : head
}

/**
 * The variations of a family that are big enough to be learned on their own, biggest first.
 * A family needs at least two of them; otherwise it is learned as a whole.
 */
export function variantCourses(family: Course): Course[] {
  const groups = new Map<string, Course['lines']>()
  for (const line of family.lines) {
    const variation = variationName(line.line.name)
    if (variation === null) continue
    groups.set(variation, [...(groups.get(variation) ?? []), line])
  }
  const variants = [...groups.entries()]
    .filter(([, lines]) => lines.length >= MIN_VARIANT_LINES)
    .map(([variation, lines]): Course => {
      const ecos = lines.map((l) => l.line.eco).sort()
      return {
        id: `${family.id}--${slug(variation)}`,
        name: `${family.name}: ${variation}`,
        lines,
        ecoFrom: ecos[0] ?? family.ecoFrom,
        ecoTo: ecos[ecos.length - 1] ?? family.ecoTo,
        parentId: family.id,
      }
    })
    .sort((a, b) => b.lines.length - a.lines.length || a.name.localeCompare(b.name))
  return variants.length >= 2 ? variants : []
}

/** Finds a family by its id, or a variant by the id `<family>--<variation>`. */
export function resolveCourse(families: readonly Course[], id: string): Course | undefined {
  const separator = id.indexOf('--')
  if (separator < 0) return families.find((c) => c.id === id)
  const family = families.find((c) => c.id === id.slice(0, separator))
  return family ? variantCourses(family).find((v) => v.id === id) : undefined
}

/** The id progress is recorded under: a variant shares its family's, so a line is learned once. */
export function progressId(course: Course): string {
  return course.parentId ?? course.id
}
