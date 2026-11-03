import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { VariantoDb } from './storage/db'
import { DexieRepertoireStore } from './storage/dexieStore'
import { createAppStore } from './ui/store/appStore'

const store = createAppStore({
  store: new DexieRepertoireStore(new VariantoDb()),
  newId: () => crypto.randomUUID(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
