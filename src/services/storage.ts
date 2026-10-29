import type { BinderCard, BinderPage, OwnedCard } from '../types/PokemonCards'

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>
export type SavedData<T> =
  | { status: 'missing'; key: string; raw: string | null }
  | { status: 'valid'; key: string; raw: string | null; value: T }
  | { status: 'invalid'; key: string; raw: string }
  | { status: 'unavailable'; key: string; raw: null }

export const importJournalKey = 'pokemon-binder-import-journal'

export const storageKeys = {
  collection: 'pokemon-binder-collection',
  binder: 'pokemon-binder-pages',
  legacyBinder: 'pokemon-binder-page-1',
  expanded: 'pokemon-binder-collection-expanded',
  spread: 'pokemon-binder-current-spread',
  page: 'pokemon-binder-current-page',
} as const

export function readText(key: string, storage?: StorageAccess): SavedData<string> {
  try {
    const raw = (storage ?? window.localStorage).getItem(key)
    return raw === null ? { status: 'missing', key, raw } : { status: 'valid', key, raw, value: raw }
  } catch {
    return { status: 'unavailable', key, raw: null }
  }
}

export function loadJson<T>(key: string, validate: (value: unknown) => value is T, storage?: StorageAccess): SavedData<T> {
  const saved = readText(key, storage)
  if (saved.status !== 'valid') return saved
  try {
    const value: unknown = JSON.parse(saved.value)
    if (validate(value)) return { ...saved, value }
  } catch { /* Preserve malformed JSON exactly as it was read. */ }
  return { status: 'invalid', key, raw: saved.value }
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const positiveInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0
const text = (value: unknown): value is string => typeof value === 'string'

function isCard(value: unknown): value is BinderCard {
  return object(value) && text(value.id) && value.id.length > 0 &&
    text(value.cardId) && value.cardId.length > 0 && text(value.name) && text(value.localId) &&
    (value.image === undefined || text(value.image)) &&
    object(value.set) && text(value.set.id) && text(value.set.name) &&
    object(value.variant) && text(value.variant.variantId) && text(value.variant.type) && text(value.variant.size)
}

export function isCollection(value: unknown): value is OwnedCard[] {
  return Array.isArray(value) && value.every(card => isCard(card) &&
    object(card) && positiveInteger(card.quantity)) &&
    new Set(value.map(card => card.id)).size === value.length
}

export function isBinderPage(value: unknown): value is BinderPage {
  return object(value) && text(value.id) && value.id.length > 0 && positiveInteger(value.pageNumber) &&
    (value.name === undefined || text(value.name)) && positiveInteger(value.rows) && positiveInteger(value.columns) &&
    Array.isArray(value.slots) && value.slots.length === value.rows * value.columns &&
    value.slots.every((slot, index) => object(slot) &&
      slot.id === `page-${value.pageNumber}-slot-${index + 1}` && (slot.card === null || isCard(slot.card)))
}

export function isBinderPages(value: unknown): value is BinderPage[] {
  return Array.isArray(value) && value.every((page, index) => isBinderPage(page) && page.pageNumber === index + 1) &&
    new Set(value.map(page => page.id)).size === value.length
}

export function createBinderPage(pageNumber: number): BinderPage {
  return {
    id: `page-${pageNumber}`, pageNumber, rows: 3, columns: 3,
    slots: Array.from({ length: 9 }, (_, index) => ({ id: `page-${pageNumber}-slot-${index + 1}`, card: null })),
  }
}

export function completeBinder(pages: BinderPage[]): BinderPage[] {
  return [...pages, ...Array.from({ length: Math.max(0, 40 - pages.length) }, (_, index) => createBinderPage(pages.length + index + 1))]
}

export function loadBinder(storage?: StorageAccess): SavedData<BinderPage[]> {
  const modern = loadJson(storageKeys.binder, isBinderPages, storage)
  if (modern.status === 'valid') return { ...modern, value: completeBinder(modern.value) }
  if (modern.status !== 'missing') return modern
  const legacy = loadJson(storageKeys.legacyBinder, isBinderPage, storage)
  if (legacy.status === 'valid') {
    if (legacy.value.pageNumber !== 1) return { status: 'invalid', key: legacy.key, raw: legacy.raw! }
    return { status: 'valid', key: storageKeys.binder, raw: null, value: completeBinder([legacy.value]) }
  }
  return legacy.status === 'missing' ? modern : legacy
}

// Compare with the loaded value before saving, so another tab or a changed save
// cannot be silently replaced. Update the snapshot only after a successful write.
export function saveText<T>(saved: SavedData<T>, value: string, storage?: StorageAccess): string | null {
  if (saved.status === 'invalid' || saved.status === 'unavailable') return 'Saving is blocked because the original saved data could not be loaded safely.'
  try {
    const target = storage ?? window.localStorage
    if (target.getItem(importJournalKey) !== null) return 'Saving is paused while an import is being recovered. Close other binder tabs and finish recovery.'
    const current = target.getItem(saved.key)
    if (current !== saved.raw) return 'Saved data changed in another tab or outside this session. Saving is paused; reload after backing up your changes.'
    target.setItem(saved.key, value)
    saved.raw = value
    return null
  } catch {
    return 'Browser storage could not be written. Changes remain in memory and may be lost when this page closes.'
  }
}

export function saveJson<T>(saved: SavedData<T>, value: T, storage?: StorageAccess): string | null {
  try {
    return saveText(saved, JSON.stringify(value), storage)
  } catch {
    return 'Changes could not be serialized and have not been saved.'
  }
}
