import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BackupRoot from './components/BackupRoot'
import { recoverImport } from './services/backup'

// Recover before App can initialize or run any autosave effects.
const initialRecovery = recoverImport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackupRoot initialRecovery={initialRecovery} />
  </StrictMode>,
)
