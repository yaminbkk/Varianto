import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { localDay, streakInfo, type StreakInfo } from '../domain/learn/streak'
import { onActivityRecorded } from '../storage/activity'
import { useProgress } from './useProgress'

/**
 * The learner's daily streak, or null while it loads or when it cannot be read (the app works
 * without it). It is read again on every navigation, so it is fresh after a lesson.
 */
export function useStreak(): StreakInfo | null {
  const progress = useProgress()
  const { key } = useLocation()
  const [info, setInfo] = useState<StreakInfo | null>(null)
  // Bumped when a day is recorded, so the badge updates without leaving the page.
  const [recorded, setRecorded] = useState(0)

  useEffect(() => onActivityRecorded(() => setRecorded((n) => n + 1)), [])

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
  }, [progress, key, recorded])

  return info
}
