import { Link } from 'react-router-dom'
import { LogoMark } from './Logo'
import { accountPath, homePath } from './paths'
import { useAccount } from './useAccount'

/** The bar at the top of every page: the logo and name at the left, linking home. */
export default function AppHeader() {
  const { auth, user } = useAccount()
  return (
    <header className="site-header">
      <Link className="brand-link" to={homePath} aria-label="Varianto, home">
        <LogoMark size={32} />
        <span>Varianto</span>
      </Link>
      {auth.enabled && (
        <Link className="account-link" to={accountPath}>
          {user ? user.email : 'Sign in'}
        </Link>
      )}
    </header>
  )
}
