import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { localDay, streakInfo, type StreakInfo } from '../domain/learn/streak'
import { useProgress } from './useProgress'

/**
 * The learner's daily streak, or null while it loads or when it cannot be read (the app works
 * without it). It is read again on every navigation, so it is fresh after a lesson.
 */
export function useStreak(): StreakInfo | null {
  const progress = useProgress()
  const { key } = useLocation()
  const [info, setInfo] = useState<StreakInfo | null>(null)

  useEffect(() => {
    let alive = true
    progress.activityDays().then(
      (days) => {
        if (alive) setInfo(streakInfo(days, localDay(new Date())))
      },
      () => {
        if (alive) setInfo(null)
      },
    )
    return () => {
      alive = false
    }
  }, [progress, key])

  return info
}
