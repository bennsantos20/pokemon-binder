import { completeBinder, importJournalKey, isBinderPages, isCollection, storageKeys } from './storage.ts'
import type { BinderPage, OwnedCard } from '../types/PokemonCards'

export interface BackupPreferences {
  collectionExpanded: boolean
  currentSpread: number
  mobilePage: number
  collectionView?: 'grid' | 'list'
  searchView?: 'grid' | 'list'
}
export interface Backup {
  format: 'pokemon-binder-backup'
  version: 1
  exportedAt: string
  collection: OwnedCard[]
  binderPages: BinderPage[]
  preferences: BackupPreferences
}
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export const journalKey = importJournalKey
export const backupKeys = Object.values(storageKeys)
export type Snapshot = Record<string, string | null>
export type Recovery = { ok: boolean; message: string; imported?: boolean; needsRecovery?: boolean }
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function validateBackup(value: unknown): value is Backup {
  if (!record(value) || value.format !== 'pokemon-binder-backup' || value.version !== 1 ||
    typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)) ||
    !isCollection(value.collection) || !isBinderPages(value.binderPages) || !record(value.preferences)) return false
  const p = value.preferences
  const length = Math.max(40, value.binderPages.length)
  return typeof p.collectionExpanded === 'boolean' && Number.isInteger(p.currentSpread) &&
    (p.currentSpread as number) >= 0 && (p.currentSpread as number) <= Math.ceil(length / 2) &&
    Number.isInteger(p.mobilePage) && (p.mobilePage as number) >= 1 && (p.mobilePage as number) <= length &&
    (p.collectionView === undefined || p.collectionView === 'grid' || p.collectionView === 'list') &&
    (p.searchView === undefined || p.searchView === 'grid' || p.searchView === 'list')
}
export function parseBackup(raw: string): Backup {
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw Error('This file is not valid JSON.') }
  if (!validateBackup(value)) throw Error('Unsupported or invalid backup. Choose a complete Pokémon Binder backup, version 1.')
  return value
}
export function exportBackup(collection: OwnedCard[], binderPages: BinderPage[], preferences: BackupPreferences): string {
  const value: Backup = { format: 'pokemon-binder-backup', version: 1, exportedAt: new Date().toISOString(), collection, binderPages, preferences }
  if (!validateBackup(value)) throw Error('Current data could not be validated. No backup was created.')
  return JSON.stringify(value, null, 2)
}
export function snapshot(storage: Store = window.localStorage): Snapshot {
  return Object.fromEntries(backupKeys.map(key => [key, storage.getItem(key)]))
}
function matches(a: Snapshot, b: Snapshot) { return backupKeys.every(key => a[key] === b[key]) }
function validSnapshot(v: unknown): v is Snapshot {
  return record(v) && Object.keys(v).length === backupKeys.length &&
    backupKeys.every(key => Object.hasOwn(v, key) && (v[key] === null || typeof v[key] === 'string'))
}
function writeVerified(storage: Store, key: string, value: string | null) {
  if (storage.getItem(key) !== value) {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
  if (storage.getItem(key) !== value) throw Error('Storage verification failed.')
}
function clearJournal(storage: Store) {
  storage.removeItem(journalKey)
  if (storage.getItem(journalKey) !== null) throw Error('Recovery journal could not be removed.')
}
export function recoverImport(storage?: Store): Recovery {
  try {
    const target = storage ?? window.localStorage
    const raw = target.getItem(journalKey)
    if (raw === null) return { ok: true, message: '' }
    const journal: unknown = JSON.parse(raw)
    if (!record(journal) || journal.version !== 1 || !validSnapshot(journal.before) || !validSnapshot(journal.after) ||
      (journal.phase !== 'prepared' && journal.phase !== 'committed')) throw Error('Invalid recovery journal.')
    const before = journal.before
    const after = journal.after
    const current = snapshot(target)
    if (backupKeys.some(key => current[key] !== before[key] && current[key] !== after[key])) {
      throw Error('Storage changed outside this import.')
    }
    const desired = journal.phase === 'committed' ? journal.after : journal.before
    for (const key of backupKeys) writeVerified(target, key, desired[key])
    clearJournal(target)
    return { ok: true, imported: journal.phase === 'committed', message: journal.phase === 'committed' ? 'Your completed import was recovered.' : 'An interrupted import was rolled back. Your previous saved data was restored.' }
  } catch {
    return { ok: false, message: 'Import recovery could not complete. Editing and saving are blocked. Keep this page open, close other binder tabs, download raw recovery data, and free browser storage or restore storage access before retrying. Do not delete the recovery journal.' }
  }
}
export function importBackup(backup: Backup, expected: Snapshot, storage?: Store): Recovery {
  let prepared = false
  try {
    if (!validateBackup(backup)) throw Error('Invalid backup.')
    const target = storage ?? window.localStorage
    if (target.getItem(journalKey) !== null) return { ok: false, needsRecovery: true, message: 'An import journal already exists. Recover it before importing again.' }
    const before = snapshot(target)
    if (!matches(before, expected)) return { ok: false, message: 'Saved data changed since the preview. Cancel and select the file again after closing other binder tabs.' }
    const after: Snapshot = { ...before,
      [storageKeys.collection]: JSON.stringify(backup.collection),
      [storageKeys.binder]: JSON.stringify(completeBinder(backup.binderPages)),
      [storageKeys.expanded]: String(backup.preferences.collectionExpanded),
      [storageKeys.spread]: String(backup.preferences.currentSpread),
      [storageKeys.page]: String(backup.preferences.mobilePage),
    }
    const journal = { version: 1, phase: 'prepared', before, after }
    const raw = JSON.stringify(journal)
    target.setItem(journalKey, raw)
    prepared = true
    if (target.getItem(journalKey) !== raw) throw Error('Journal verification failed.')
    if (!matches(snapshot(target), before)) throw Error('Storage changed before replacement.')
    for (const key of backupKeys) writeVerified(target, key, after[key])
    // A durable commit marker makes startup recovery finish a verified import.
    const committed = JSON.stringify({ ...journal, phase: 'committed' })
    target.setItem(journalKey, committed)
    if (target.getItem(journalKey) !== committed) throw Error('Commit verification failed.')
    clearJournal(target)
    return { ok: true, message: 'Backup imported successfully.' }
  } catch {
    if (prepared) {
      const recovery = recoverImport(storage)
      return { ok: Boolean(recovery.ok && recovery.imported), needsRecovery: !recovery.ok,
        message: recovery.message || 'Import failed. Your previous saved data is unchanged.' }
    }
    return { ok: false, message: 'Import could not start. No collection or binder data was replaced. Check the backup and available browser storage.' }
  }
}
export function rawRecovery(storage?: Store): string {
  const values: Record<string, unknown> = {}
  for (const key of [...backupKeys, journalKey]) {
    try { values[key] = (storage ?? window.localStorage).getItem(key) }
    catch { values[key] = { unreadable: true } }
  }
  return JSON.stringify({ format: 'pokemon-binder-raw-recovery', exportedAt: new Date().toISOString(), values }, null, 2)
}
export function downloadJson(raw: string, name: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
  try {
    const link = document.createElement('a')
    link.href = url; link.download = name
    document.body.append(link)
    try { link.click() } finally { link.remove() }
  } finally { URL.revokeObjectURL(url) }
}
export function backupCounts(collection: OwnedCard[], pages: BinderPage[]) {
  return [collection.length, collection.reduce((n, c) => n + c.quantity, 0), pages.length,
    pages.reduce((n, p) => n + p.slots.filter(s => s.card).length, 0), pages.filter(p => p.name?.trim()).length]
}
