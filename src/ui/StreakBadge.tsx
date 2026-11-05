import type { StreakInfo } from '../domain/learn/streak'

/** Words for the streak, shown to everyone and read out to screen readers. */
export function streakText(info: StreakInfo): string {
  const days = `${info.current}-day streak`
  return info.activeToday ? `${days}, done today` : `${days}, practise today to keep it`
}

/** The daily streak in the header. Nothing is shown until the learner has a streak. */
export default function StreakBadge({ info }: { info: StreakInfo | null }) {
  if (!info || info.current === 0) return null
  return (
    <span className="streak-badge" data-done={info.activeToday}>
      {streakText(info)}
    </span>
  )
}
