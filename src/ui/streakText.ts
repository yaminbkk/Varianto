import type { StreakInfo } from '../domain/learn/streak'

/** Words for the streak, shown to everyone and read out to screen readers. */
export function streakText(info: StreakInfo): string {
  const days = `${info.current}-day streak`
  return info.activeToday ? `${days}, done today` : `${days}, practise today to keep it`
}
