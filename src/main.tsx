import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { VariantoDb } from './storage/db'
import { DexieProgressStore } from './storage/dexieProgress'
import { DexieRepertoireStore } from './storage/dexieStore'
import { createAppStore } from './ui/store/appStore'

const db = new VariantoDb()
const progress = new DexieProgressStore(db)
const store = createAppStore({
  store: new DexieRepertoireStore(db),
  newId: () => crypto.randomUUID(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} progress={progress} />
  </StrictMode>,
)
