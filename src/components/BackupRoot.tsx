import { useState } from 'react'
import App from '../App'
import { downloadJson, rawRecovery, recoverImport } from '../services/backup'
import type { BackupPreferences, Recovery } from '../services/backup'

export default function BackupRoot({ initialRecovery }: { initialRecovery: Recovery }) {
  const [recovery, setRecovery] = useState(initialRecovery)
  const [session, setSession] = useState<{ id: number; preferences?: BackupPreferences; message: string }>({ id: 0, message: initialRecovery.message })
  const [error, setError] = useState('')
  if (!recovery.ok) return <main className="backup-recovery" role="alert">
    <h1>Backup recovery needs attention</h1><p>{recovery.message}</p>
    <button type="button" onClick={() => {
      try { downloadJson(rawRecovery(), 'pokemon-binder-raw-recovery.json') }
      catch { setError('Download failed. Keep this page open and preserve browser storage.') }
    }}>Download Raw Recovery Data</button>
    <button type="button" onClick={() => setRecovery(recoverImport())}>Retry Recovery</button>
    {error && <p>{error}</p>}
  </main>
  return <App key={session.id} importedPreferences={session.preferences} backupMessage={session.message || recovery.message}
    onBackupImported={preferences => setSession(previous => ({ id: previous.id + 1, preferences, message: 'Backup imported successfully.' }))} />
}
