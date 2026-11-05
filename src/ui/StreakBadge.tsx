import type { StreakInfo } from '../domain/learn/streak'
import { streakText } from './streakText'

/** The daily streak in the header. Nothing is shown until the learner has a streak. */
export default function StreakBadge({ info }: { info: StreakInfo | null }) {
  if (!info || info.current === 0) return null
  return (
    <span className="streak-badge" data-done={info.activeToday}>
      {streakText(info)}
    </span>
  )
}
