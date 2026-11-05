const STORAGE_KEY = 'varianto.evalbar'

/** The eval bar is off unless the learner turned it on. Storage can be blocked, so failures mean "off". */
export function loadEvalEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

export function saveEvalEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // The choice just does not persist.
  }
}
