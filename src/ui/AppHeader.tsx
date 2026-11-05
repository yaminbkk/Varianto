import { Link } from 'react-router-dom'
import { LogoMark } from './Logo'
import { accountPath, homePath } from './paths'
import StreakBadge from './StreakBadge'
import { useAccount } from './useAccount'
import { useStreak } from './useStreak'

/** The bar at the top of every page: the logo and name at the left, linking home. */
export default function AppHeader() {
  const { auth, user } = useAccount()
  const streak = useStreak()
  return (
    <header className="site-header">
      <Link className="brand-link" to={homePath} aria-label="Varianto, home">
        <LogoMark size={32} />
        <span>Varianto</span>
      </Link>
      <StreakBadge info={streak} />
      {auth.enabled && (
        <Link className="account-link" to={accountPath}>
          {user ? user.email : 'Sign in'}
        </Link>
      )}
    </header>
  )
}
