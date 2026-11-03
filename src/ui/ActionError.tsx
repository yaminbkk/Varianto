import { useAppStore } from './useAppStore'

/** Shows the store's error for a failed action, next to the control that triggered it. */
export default function ActionError({ failed }: { failed: boolean }) {
  const error = useAppStore((s) => s.error)
  const saveError = useAppStore((s) => s.saveError)
  const message = saveError ? 'Changes are not saved. Check browser storage.' : error
  return <div role="alert">{failed && message && <p className="alert">{message}</p>}</div>
}
