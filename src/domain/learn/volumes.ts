import { ecoFamily } from '../openings/ecoFamily'
import type { Course } from './courses'

export type Volume = 'A' | 'B' | 'C' | 'D' | 'E' | 'Other'

export interface VolumeGroup {
  volume: Volume
  /** Readable family name, for example "Open games (C)". */
  label: string
  courses: Course[]
}

const ORDER: readonly Volume[] = ['A', 'B', 'C', 'D', 'E', 'Other']

function volumeOf(course: Course): Volume {
  const letter = course.ecoFrom.charAt(0).toUpperCase()
  return ORDER.find((v) => v === letter) ?? 'Other'
}

/**
 * Groups courses by ECO volume (A to E, then Other). Inside a volume the deepest course comes
 * first, since the number of lines is the only popularity signal the data carries.
 */
export function groupByVolume(courses: readonly Course[]): VolumeGroup[] {
  const byVolume = new Map<Volume, Course[]>()
  for (const course of courses) {
    const volume = volumeOf(course)
    byVolume.set(volume, [...(byVolume.get(volume) ?? []), course])
  }
  return ORDER.flatMap((volume) => {
    const members = byVolume.get(volume)
    if (!members) return []
    const sorted = [...members].sort(
      (a, b) => b.lines.length - a.lines.length || a.name.localeCompare(b.name),
    )
    const label = volume === 'Other' ? 'Other' : ecoFamily(`${volume}00`)
    return [{ volume, label, courses: sorted }]
  })
}

/**
 * Courses the learner has started but not finished, most learned first. Variant courses are
 * skipped: their progress is recorded under their parent.
 */
export function inProgress(
  courses: readonly Course[],
  learnedCounts: ReadonlyMap<string, number>,
  limit = 3,
): Course[] {
  return courses
    .filter((c) => {
      if (c.parentId) return false
      const done = learnedCounts.get(c.id) ?? 0
      return done > 0 && done < c.lines.length
    })
    .sort((a, b) => (learnedCounts.get(b.id) ?? 0) - (learnedCounts.get(a.id) ?? 0))
    .slice(0, limit)
}
