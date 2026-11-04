import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBackends } from './app/backends'
import { createAuthService } from './auth/auth'
import { watchSession } from './auth/watchSession'
import { VariantoDb } from './storage/db'
import { DexieProgressStore } from './storage/dexieProgress'
import { DexieRepertoireStore } from './storage/dexieStore'
import { createAppStore } from './ui/store/appStore'

const db = new VariantoDb()
const auth = createAuthService({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})
const backends = createBackends(
  { repertoires: new DexieRepertoireStore(db), progress: new DexieProgressStore(db) },
  auth,
)

// A guest never reaches the network: currentUser() returns at once when accounts are not
// configured. If restoring a session fails (for example offline), carry on as a guest.
let user = await auth.currentUser().catch(() => undefined)
if (user) {
  try {
    await backends.useAccount()
  } catch {
    backends.useGuest()
    user = undefined
  }
}

// The stores were built for this user. If another tab signs out or signs in as someone else,
// reload so this tab cannot write one account's data into another.
if (user) watchSession(auth, user.id, () => window.location.reload())

const store = createAppStore({
  store: backends.current.repertoires,
  newId: () => crypto.randomUUID(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} progress={backends.current.progress} account={{ auth, backends, user }} />
  </StrictMode>,
)
