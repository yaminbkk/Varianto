import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { copyLocalToAccount } from '../../storage/migrate'
import { homePath } from '../paths'
import SkipLink from '../SkipLink'
import { useAccount } from '../useAccount'

/** Reloads so every page reads from the backend that is now in use. */
function reloadApp() {
  window.location.hash = homePath
  window.location.reload()
}

export default function AccountPage() {
  const { auth, backends, user } = useAccount()
  const mainRef = useRef<HTMLElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setMessage(null)
    try {
      const done = await action()
      if (done !== null) setMessage(done)
      setFailed(false)
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      await auth.signIn(email.trim(), password)
      await backends.useAccount()
      reloadApp()
      return null
    })
  }

  async function onSignUp() {
    await run(async () => {
      const { needsConfirmation } = await auth.signUp(email.trim(), password)
      if (needsConfirmation) return 'Check your email to confirm your account, then sign in.'
      await backends.useAccount()
      reloadApp()
      return null
    })
  }

  async function onCopy() {
    await run(async () => {
      const summary = await copyLocalToAccount(backends.local, await backends.useAccount())
      return `Copied ${summary.repertoires} repertoires and ${summary.lines} learned lines to your account.`
    })
  }

  async function onSignOut() {
    await run(async () => {
      await auth.signOut()
      backends.useGuest()
      reloadApp()
      return null
    })
  }

  return (
    <>
      <SkipLink targetRef={mainRef} />
      <main id="main" ref={mainRef} tabIndex={-1} className="app">
        <h1>Account</h1>
        {!auth.enabled ? (
          <p className="hint">
            Accounts are not set up in this copy of Varianto. Your data stays in this browser.
          </p>
        ) : user ? (
          <>
            <p>
              Signed in as <strong>{user.email}</strong>. Your repertoires and progress are saved in
              your account.
            </p>
            <div className="actions">
              <button type="button" className="btn" disabled={busy} onClick={onCopy}>
                Copy my guest data to this account
              </button>
              <button type="button" className="btn" disabled={busy} onClick={onSignOut}>
                Sign out
              </button>
            </div>
            <p className="hint">
              Guest data stays in this browser. Copying it does not remove it, and signing out
              brings it back.
            </p>
          </>
        ) : (
          <>
            <p className="hint">
              An account is optional. Sign in to keep your repertoires and progress across devices.
              Without one, everything stays in this browser.
            </p>
            <form onSubmit={onSignIn}>
              <div className="field">
                <label htmlFor="account-email">Email</label>
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="account-password">Password</label>
                <input
                  id="account-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Sign in
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy || email.trim() === '' || password.length < 6}
                  onClick={onSignUp}
                >
                  Create account
                </button>
              </div>
            </form>
          </>
        )}
        <div role="status">{message && <p className={failed ? 'alert' : 'hint'}>{message}</p>}</div>
        <p>
          <Link to={homePath}>Back to your repertoires</Link>
        </p>
      </main>
    </>
  )
}
