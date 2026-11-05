/** The local calendar date of `date` as `YYYY-MM-DD`. */
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days since 1970 for a `YYYY-MM-DD` string, independent of time zone and daylight saving. */
function dayNumber(day: string): number {
  const [year, month, date] = day.split('-').map(Number)
  return Math.round(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1) / DAY_MS)
}

export interface StreakInfo {
  /** Consecutive active days ending today, or ending yesterday while today is still open. */
  current: number
  longest: number
  activeToday: boolean
}

/** Streak figures from the set of active days (`YYYY-MM-DD`) and today's date. */
export function streakInfo(days: readonly string[], today: string): StreakInfo {
  const todayNumber = dayNumber(today)
  // Days after today (a changed time zone or a wrong clock) must not hide the real streak.
  const numbers = [...new Set(days.map(dayNumber))]
    .filter((n) => n <= todayNumber)
    .sort((a, b) => a - b)
  let longest = 0
  let run = 0
  let previous: number | null = null
  let lastRun = 0
  let lastDay: number | null = null
  for (const n of numbers) {
    run = previous !== null && n === previous + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = n
    lastRun = run
    lastDay = n
  }
  const activeToday = lastDay === todayNumber
  const alive = lastDay !== null && (lastDay === todayNumber || lastDay === todayNumber - 1)
  return { current: alive ? lastRun : 0, longest, activeToday }
}
