import { Link } from 'react-router-dom'
import { homePath } from '../paths'

/** Shown when a route fails to load or throws, for example when the network drops mid-session. */
export default function ErrorPage() {
  return (
    <main id="main" className="app">
      <h1>Something went wrong</h1>
      <p>This page could not be loaded. Check your connection and try again.</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
        <Link className="btn" to={homePath}>
          Back to your repertoires
        </Link>
      </div>
    </main>
  )
}
