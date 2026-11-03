import { Link } from 'react-router-dom'
import { homePath } from '../paths'

export default function NotFoundPage() {
  return (
    <main className="app">
      <h1>Page not found</h1>
      <p>
        <Link to={homePath}>Back to your repertoires</Link>
      </p>
    </main>
  )
}
