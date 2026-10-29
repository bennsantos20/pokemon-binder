import { test } from 'node:test'
import assert from 'node:assert/strict'
import { backupCounts, backupKeys, exportBackup, importBackup, journalKey, parseBackup, rawRecovery, recoverImport, snapshot } from '../src/services/backup.ts'
import { createBinderPage, isCollection, loadBinder, loadJson, saveJson, storageKeys } from '../src/services/storage.ts'

const card = { id: 'test-normal', cardId: 'test', name: 'Pikachu', localId: '1',
  set: { id: 'test', name: 'Test' }, variant: { variantId: 'normal', type: 'normal', size: 'normal' }, quantity: 3, extra: { retained: true } }
const page: ReturnType<typeof createBinderPage> & { extra: string } = { ...createBinderPage(1), name: 'Favorites', extra: 'preserved' }
page.slots[0].card = card
const backup = () => parseBackup(exportBackup([card], [page], {
  collectionExpanded: true, currentSpread: 0, mobilePage: 1, collectionView: 'list', searchView: 'grid',
}))
function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const operations: string[] = []
  let fail = -1
  let count = 0
  let blocked = false
  return {
    data, operations,
    failOnce(index: number) { fail = index; count = 0 },
    block(value: boolean) { blocked = value },
    getItem(key: string) { if (blocked) throw Error('Unavailable'); return data.get(key) ?? null },
    setItem(key: string, value: string) {
      operations.push(key)
      if (blocked || count++ === fail) throw Error('Quota')
      data.set(key, value)
    },
    removeItem(key: string) {
      operations.push(key)
      if (blocked || count++ === fail) throw Error('Quota')
      data.delete(key)
    },
  }
}

test('backup export preserves names, quantities, variants, optional fields and extra properties', () => {
  const exported = backup()
  assert.equal(exported.version, 1)
  assert.equal(exported.collection[0].quantity, 3)
  assert.deepEqual(exported.collection[0], card)
  assert.deepEqual(exported.binderPages[0], page)
  assert.deepEqual(backupCounts(exported.collection, exported.binderPages), [1, 3, 1, 1, 1])
})

test('invalid JSON, schema, preferences and future/older versions cause zero writes', () => {
  const store = memory()
  for (const value of ['{bad', '{}', JSON.stringify({ ...backup(), version: 2 }),
    JSON.stringify({ ...backup(), version: 0 }), JSON.stringify({ ...backup(), collection: null }),
    JSON.stringify({ ...backup(), binderPages: [{}] }), JSON.stringify({ ...backup(), preferences: { mobilePage: -1 } })]) {
    assert.throws(() => parseBackup(value))
  }
  assert.equal(importBackup({ ...backup(), version: 2 } as never, snapshot(store), store).ok, false)
  assert.equal(store.operations.length, 0)
})

test('successful import retains existing storage formats, legacy source, and unrelated values', () => {
  const store = memory({ [storageKeys.legacyBinder]: 'original legacy raw', unrelated: 'keep' })
  assert.equal(importBackup(backup(), snapshot(store), store).ok, true)
  assert.deepEqual(JSON.parse(store.data.get(storageKeys.collection)!), [card])
  assert.equal(JSON.parse(store.data.get(storageKeys.binder)!)[0].name, 'Favorites')
  assert.equal(JSON.parse(store.data.get(storageKeys.binder)!).length, 40)
  assert.equal(store.data.get(storageKeys.expanded), 'true')
  assert.equal(store.data.get(storageKeys.spread), '0')
  assert.equal(store.data.get(storageKeys.page), '1')
  assert.equal(store.data.get(storageKeys.legacyBinder), 'original legacy raw')
  assert.equal(store.data.get('unrelated'), 'keep')
  assert.equal(store.data.has(journalKey), false)
})

test('empty collections and empty binder arrays import with the existing minimum of 40 pages', () => {
  const empty = parseBackup(exportBackup([], [], { collectionExpanded: false, currentSpread: 0, mobilePage: 1 }))
  const store = memory({ [storageKeys.collection]: JSON.stringify([card]) })
  assert.equal(importBackup(empty, snapshot(store), store).ok, true)
  assert.equal(store.data.get(storageKeys.collection), '[]')
  assert.equal(JSON.parse(store.data.get(storageKeys.binder)!).length, 40)
})

test('storage changes after preview prevent replacement without creating a journal', () => {
  const store = memory()
  const expected = snapshot(store)
  store.data.set(storageKeys.collection, 'new contents')
  assert.equal(importBackup(backup(), expected, store).ok, false)
  assert.equal(store.operations.length, 0)
})

test('each write failure rolls back exact prior values, including missing keys and invalid raw strings', () => {
  const initial = { [storageKeys.collection]: '{old-invalid', [storageKeys.expanded]: '', [storageKeys.legacyBinder]: 'legacy' }
  for (let failure = 0; failure < 8; failure++) {
    const store = memory(initial)
    const before = snapshot(store)
    store.failOnce(failure)
    const result = importBackup(backup(), before, store)
    assert.equal(recoverImport(store).ok, true)
    const after = snapshot(store)
    if (result.ok) assert.deepEqual(JSON.parse(after[storageKeys.collection]!), [card])
    else assert.deepEqual(after, before)
    assert.equal(store.data.has(journalKey), false)
  }
})

function journalFixture(phase = 'prepared') {
  const store = memory({ [storageKeys.collection]: 'old exact raw', [storageKeys.expanded]: '' })
  const before = snapshot(store)
  const after = { ...before, [storageKeys.collection]: JSON.stringify([card]), [storageKeys.binder]: JSON.stringify([page]) }
  store.data.set(journalKey, JSON.stringify({ version: 1, phase, before, after }))
  return { store, before, after }
}

test('startup recovers an interrupted prepared import and preserves missing-key states', () => {
  const { store, before, after } = journalFixture()
  store.data.set(storageKeys.collection, after[storageKeys.collection]!)
  assert.equal(recoverImport(store).ok, true)
  assert.deepEqual(snapshot(store), before)
  assert.equal(store.data.has(storageKeys.binder), false)
})

test('a committed import is completed rather than rolled back at startup', () => {
  const { store, after } = journalFixture('committed')
  store.data.set(storageKeys.collection, after[storageKeys.collection]!)
  const result = recoverImport(store)
  assert.equal(result.ok, true)
  assert.equal(result.imported, true)
  assert.deepEqual(snapshot(store), after)
})

test('failed rollback keeps journal and blocks normal autosave until recovery succeeds', () => {
  const { store, before, after } = journalFixture()
  store.data.set(storageKeys.collection, after[storageKeys.collection]!)
  store.failOnce(0)
  assert.equal(recoverImport(store).ok, false)
  assert.equal(store.data.has(journalKey), true)
  const loaded = loadJson(storageKeys.collection, isCollection, store)
  assert.ok(saveJson(loaded, [], store))
  assert.equal(recoverImport(store).ok, true)
  assert.deepEqual(snapshot(store), before)
})

test('malformed journals and conflicting external changes are preserved without writes', () => {
  for (const raw of ['invalid', '{}', JSON.stringify({ version: 99 })]) {
    const store = memory({ [journalKey]: raw })
    assert.equal(recoverImport(store).ok, false)
    assert.equal(store.data.get(journalKey), raw)
    assert.equal(store.operations.length, 0)
  }
  const { store } = journalFixture()
  store.data.set(storageKeys.binder, 'another tab changed this')
  assert.equal(recoverImport(store).ok, false)
  assert.equal(store.operations.length, 0)
})

test('storage access failure blocks recovery and import without modifying contents', () => {
  const store = memory()
  const expected = snapshot(store)
  store.block(true)
  assert.equal(recoverImport(store).ok, false)
  assert.equal(importBackup(backup(), expected, store).ok, false)
  store.block(false)
  assert.equal(store.data.size, 0)
})

test('fresh persistence snapshots after import allow subsequent collection and binder saves', () => {
  const store = memory()
  const stale = loadJson(storageKeys.collection, isCollection, store)
  assert.equal(importBackup(backup(), snapshot(store), store).ok, true)
  assert.ok(saveJson(stale, [], store))
  const fresh = loadJson(storageKeys.collection, isCollection, store)
  const pages = loadBinder(store)
  assert.equal(saveJson(fresh, [{ ...card, quantity: 4 }], store), null)
  if (pages.status !== 'valid') throw Error('Expected valid binder')
  assert.equal(saveJson(pages, pages.value, store), null)
})

test('raw recovery export preserves unreadable/invalid originals and is not accepted as an import', () => {
  const store = memory({ [storageKeys.collection]: '{bad', [journalKey]: 'bad journal' })
  const raw = rawRecovery(store)
  const parsed = JSON.parse(raw)
  assert.equal(parsed.values[storageKeys.collection], '{bad')
  assert.equal(parsed.values[journalKey], 'bad journal')
  assert.equal(Object.keys(parsed.values).length, backupKeys.length + 1)
  assert.throws(() => parseBackup(raw))
  store.block(true)
  assert.deepEqual(JSON.parse(rawRecovery(store)).values[storageKeys.collection], { unreadable: true })
})

test('silent journal write failure is detected before any data replacement and reports an error', () => {
  const store = memory({ [storageKeys.collection]: '[]' })
  const original = snapshot(store)
  const silent = { ...store, setItem(key: string, value: string) { if (key !== journalKey) store.setItem(key, value) } }
  const result = importBackup(backup(), original, silent)
  assert.equal(result.ok, false)
  assert.ok(result.message)
  assert.deepEqual(snapshot(store), original)
})

test('an existing journal blocks another import and is preserved without triggering recovery writes', () => {
  const { store } = journalFixture()
  const raw = store.data.get(journalKey)
  const result = importBackup(backup(), snapshot(store), store)
  assert.equal(result.ok, false)
  assert.equal(result.needsRecovery, true)
  assert.equal(store.data.get(journalKey), raw)
  assert.equal(store.operations.length, 0)
})

test('storage failure during replacement preserves the journal for a later recovery retry', () => {
  const store = memory({ [storageKeys.collection]: 'old exact raw' })
  const before = snapshot(store)
  const failed = {
    ...store,
    setItem(key: string, value: string) {
      store.setItem(key, value)
      if (key === storageKeys.collection) { store.block(true); throw Error('Storage became unavailable') }
    },
  }
  const result = importBackup(backup(), before, failed)
  assert.equal(result.ok, false)
  assert.equal(result.needsRecovery, true)
  assert.ok(store.data.has(journalKey))
  store.block(false)
  assert.equal(recoverImport(store).ok, true)
  assert.deepEqual(snapshot(store), before)
})

test('export uses supplied in-memory state rather than older persisted quantities', () => {
  const store = memory({ [storageKeys.collection]: JSON.stringify([card]) })
  const inMemory = [{ ...card, quantity: 9 }]
  const exported = parseBackup(exportBackup(inMemory, [page], {
    collectionExpanded: false, currentSpread: 0, mobilePage: 1,
  }))
  assert.equal(exported.collection[0].quantity, 9)
  assert.equal(JSON.parse(store.data.get(storageKeys.collection)!)[0].quantity, 3)
})
