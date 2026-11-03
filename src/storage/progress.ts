/** Persistence boundary for learn-mode progress. Implementations must not leak backend types. */
export interface ProgressStore {
  /** Records the line as learned. Marking the same line again changes nothing. */
  markLearned(courseId: string, lineKey: string): Promise<void>
  /** Keys of the lines learned in the course. */
  learnedLines(courseId: string): Promise<Set<string>>
  /** Number of learned lines per course, for every course that has any. */
  learnedCounts(): Promise<Map<string, number>>
  /** Forgets all progress in the course. */
  reset(courseId: string): Promise<void>
}
