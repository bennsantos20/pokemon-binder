import { useEffect, useRef, useState } from 'react'
import type { Backup, BackupPreferences, Snapshot } from '../services/backup'
import { backupCounts, downloadJson, exportBackup, importBackup, parseBackup, rawRecovery, snapshot } from '../services/backup'
import { completeBinder } from '../services/storage'
import type { BinderPage, OwnedCard } from '../types/PokemonCards'

interface Props {
  collection: OwnedCard[]
  pages: BinderPage[]
  preferences: BackupPreferences
  complete: boolean
  onPause: (paused: boolean) => void
  onImported: (preferences: BackupPreferences) => void
}
export default function BackupControls({ collection, pages, preferences, complete, onPause, onImported }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [preview, setPreview] = useState<{ backup: Backup; expected: Snapshot; filename: string } | null>(null)
  const [message, setMessage] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    if (preview) dialog.current?.showModal()
  }, [preview])
  function downloadCurrent() {
    try {
      if (!complete) throw Error('Some saved data could not be loaded. Download raw recovery data instead; temporary defaults are not a complete backup.')
      downloadJson(exportBackup(collection, pages, preferences), `pokemon-binder-backup-${new Date().toISOString().slice(0, 10)}.json`)
      setMessage('Backup download requested. Check your Downloads folder before replacing any data.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Backup download failed.') }
  }
  function downloadRaw() {
    try { downloadJson(rawRecovery(), 'pokemon-binder-raw-recovery.json'); setMessage('Raw recovery download requested. This file is for recovery, not regular import.') }
    catch { setMessage('Recovery download failed. Keep this page open and preserve your browser storage.') }
  }
  function close() {
    if (busy || blocked) return
    dialog.current?.close(); setPreview(null); setConfirmed(false); onPause(false)
    trigger.current?.focus()
  }
  async function select(file: File) {
    onPause(true); setBusy(true); setMessage(''); setConfirmed(false)
    try {
      if (file.size > 20 * 1024 * 1024) throw Error('Choose a backup smaller than 20 MB.')
      const backup = parseBackup(await file.text())
      const expected = snapshot()
      setPreview({ backup, expected, filename: file.name })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The backup could not be read. No data was replaced.')
      onPause(false)
    } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  function replace() {
    if (!preview || !confirmed || busy) return
    setBusy(true)
    const result = importBackup(preview.backup, preview.expected)
    if (result.ok) { onImported(preview.backup.preferences); return }
    setMessage(result.message)
    if (result.needsRecovery) setBlocked(true)
    setBusy(false)
  }
  const current = backupCounts(collection, pages)
  const incoming = preview ? backupCounts(preview.backup.collection, completeBinder(preview.backup.binderPages)) : []
  return (
    <section className="backup-controls" aria-label="Backup and restore">
      <button type="button" onClick={downloadCurrent} disabled={!complete || busy}>Export Backup</button>
      <button type="button" ref={trigger} onClick={() => input.current?.click()} disabled={busy}>Import Backup</button>
      {!complete && <button type="button" onClick={downloadRaw}>Download Raw Recovery Data</button>}
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={event => {
        const file = event.target.files?.[0]; if (file) void select(file)
      }} />
      {!preview && message && <p role="status">{message}</p>}
      {!complete && <p>Some saved data is unavailable. Export is disabled to avoid backing up temporary defaults.</p>}
      <dialog ref={dialog} className="backup-dialog" aria-labelledby="backup-title" onCancel={event => { event.preventDefault(); close() }}>
        <h2 id="backup-title">Replace your binder and collection?</h2>
        {preview && <>
          <p>{preview.filename} · Exported {preview.backup.exportedAt}</p>
          <p>Import replaces your collection, binder, and saved preferences. It does not merge them. Close other binder tabs before continuing.</p>
          <table><thead><tr><th scope="col">Contents</th><th scope="col">Current{!complete && ' (temporary)'}</th><th scope="col">Incoming</th></tr></thead>
            <tbody>{['Unique cards', 'Owned copies', 'Binder pages', 'Occupied pockets', 'Named pages'].map((label, i) =>
              <tr key={label}><th scope="row">{label}</th><td>{current[i]}</td><td>{incoming[i]}</td></tr>)}</tbody></table>
          {preview.backup.collection.length === 0 && <p>The incoming collection is empty. Your current inventory will be replaced with an empty collection.</p>}
          {preview.backup.binderPages.length < 40 && <p>The incoming binder contains {preview.backup.binderPages.length} pages. Empty pages will be added to reach the app’s minimum of 40.</p>}
          <p>Download your current data first. Your browser cannot confirm whether you saved the downloaded file.</p>
          <button type="button" onClick={downloadCurrent} disabled={!complete || busy}>Download Current Backup</button>
          <button type="button" onClick={downloadRaw} disabled={busy}>Download Raw Recovery Data</button>
          <label className="backup-confirm"><input type="checkbox" checked={confirmed} disabled={busy || blocked} onChange={e => setConfirmed(e.target.checked)} />
            I understand this replaces my existing collection and binder, including any unsaved changes.</label>
          <div className="backup-actions"><button type="button" onClick={close} disabled={busy || blocked} autoFocus>Cancel</button>
            <button type="button" onClick={replace} disabled={!confirmed || busy || blocked}>Replace Collection and Binder</button></div>
          {message && <p role="alert">{message}</p>}
          {blocked && <p>Recovery is required. Download raw recovery data, then reload to retry recovery. Editing and saving remain blocked.</p>}
        </>}
      </dialog>
    </section>
  )
}
