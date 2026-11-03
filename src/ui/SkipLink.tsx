import type { MouseEvent, RefObject } from 'react'

/** A plain href="#main" would change the hash route, so move focus by hand. */
export default function SkipLink({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  function skip(e: MouseEvent) {
    e.preventDefault()
    targetRef.current?.focus()
  }
  return (
    <a className="skip-link" href="#main" onClick={skip}>
      Skip to main content
    </a>
  )
}
