import { Link } from 'react-router-dom'
import { LogoMark } from './Logo'
import { homePath } from './paths'

/** The bar at the top of every page: the logo and name at the left, linking home. */
export default function AppHeader() {
  return (
    <header className="site-header">
      <Link className="brand-link" to={homePath} aria-label="Varianto, home">
        <LogoMark size={32} />
        <span>Varianto</span>
      </Link>
    </header>
  )
}
