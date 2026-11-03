/** Shows the message captured when an action failed, next to the control that triggered it. */
export default function ActionError({ message }: { message: string | null }) {
  return <div role="alert">{message && <p className="alert">{message}</p>}</div>
}
