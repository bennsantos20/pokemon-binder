import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  completeBinder, createBinderPage, isCollection, isBinderPages,
  loadJson, loadBinder, readText, saveJson, saveText, storageKeys,
} from '../src/services/storage.ts'

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const writes: string[] = []
  return { data, writes, getItem: (key: string) => data.get(key) ?? null,
    setItem(key: string, value: string) { writes.push(key); data.set(key, value) } }
}
const card = {
  id: 'base1-1-normal', cardId: 'base1-1', name: 'Alakazam', localId: '1',
  set: { id: 'base1', name: 'Base Set', extra: true },
  variant: { variantId: 'normal', type: 'normal', size: 'normal' }, quantity: 2,
  extra: { retained: true },
}

test('valid collection retains quantities, optional images and extra properties', () => {
  const store = memory({ [storageKeys.collection]: JSON.stringify([card, { ...card, id: 'other', image: 'https://example.test/card' }]) })
  const loaded = loadJson(storageKeys.collection, isCollection, store)
  assert.equal(loaded.status, 'valid')
  if (loaded.status !== 'valid') throw Error('Expected valid')
  assert.equal(loaded.value[0].quantity, 2)
  assert.equal(saveJson(loaded, loaded.value, store), null)
  assert.deepEqual(JSON.parse(store.data.get(storageKeys.collection)!), loaded.value)
  assert.deepEqual(JSON.parse(store.data.get(storageKeys.collection)!)[0].extra, { retained: true })
})

test('malformed and empty JSON is preserved and cannot be autosaved over', () => {
  for (const raw of ['{broken', '']) {
    const store = memory({ [storageKeys.collection]: raw })
    const loaded = loadJson(storageKeys.collection, isCollection, store)
    assert.equal(loaded.status, 'invalid')
    assert.equal(loaded.raw, raw)
    assert.ok(saveJson(loaded, [], store))
    assert.equal(store.data.get(storageKeys.collection), raw)
    assert.equal(store.writes.length, 0)
  }
})

test('invalid collection shapes and unsafe quantities are rejected without filtering', () => {
  for (const value of [null, {}, 1, [null], [{}], [{ ...card, quantity: 0 }], [{ ...card, quantity: 1.2 }],
    [{ ...card, quantity: Number.MAX_SAFE_INTEGER + 1 }], [{ ...card, set: null }],
    [{ ...card, variant: {} }], [card, card]]) {
    assert.equal(isCollection(value), false)
  }
  assert.equal(isCollection([]), true)
})

test('missing saves permit initial autosave and repeated StrictMode-style writes', () => {
  const store = memory()
  const collection = loadJson(storageKeys.collection, isCollection, store)
  const binder = loadBinder(store)
  assert.equal(collection.status, 'missing')
  assert.equal(binder.status, 'missing')
  assert.equal(saveJson(collection, [], store), null)
  assert.equal(saveJson(collection, [card], store), null)
  assert.equal(saveJson(binder, completeBinder([]), store), null)
  assert.equal(JSON.parse(store.data.get(storageKeys.binder)!).length, 40)
})

test('valid short binders are extended without losing names, cards or unknown fields', () => {
  const page: ReturnType<typeof createBinderPage> & { custom: string } = { ...createBinderPage(1), name: 'Favorites', custom: 'retained' }
  page.slots[0].card = card
  const store = memory({ [storageKeys.binder]: JSON.stringify([page]) })
  const loaded = loadBinder(store)
  assert.equal(loaded.status, 'valid')
  if (loaded.status !== 'valid') throw Error('Expected valid')
  assert.equal(loaded.value.length, 40)
  assert.deepEqual(loaded.value[0], page)
  assert.equal(store.writes.length, 0)
  assert.equal(saveJson(loaded, loaded.value, store), null)
})

test('larger binders and optional page names are retained', () => {
  const pages = Array.from({ length: 42 }, (_, i) => createBinderPage(i + 1))
  assert.equal(isBinderPages(pages), true)
  assert.equal(completeBinder(pages).length, 42)
  assert.equal(isBinderPages([{ ...pages[0], name: null }]), false)
})

test('invalid binder shape, dimensions, page order and slot identities are rejected', () => {
  const page = createBinderPage(1)
  for (const value of [null, {}, [null], [{ ...page, slots: null }], [{ ...page, rows: 0 }],
    [{ ...page, rows: 2 }], [createBinderPage(2)], [{ ...page, slots: [{ id: 'wrong', card: null }] }],
    [{ ...page, slots: page.slots.map(s => ({ ...s, card: {} })) }]]) {
    assert.equal(isBinderPages(value), false)
  }
})

test('invalid modern save blocks legacy migration and preserves original raw data', () => {
  for (const raw of ['broken', '{}', 'null', '']) {
    const store = memory({ [storageKeys.binder]: raw, [storageKeys.legacyBinder]: JSON.stringify(createBinderPage(1)) })
    const loaded = loadBinder(store)
    assert.equal(loaded.status, 'invalid')
    assert.equal(loaded.key, storageKeys.binder)
    assert.ok(saveJson(loaded, completeBinder([]), store))
    assert.equal(store.data.get(storageKeys.binder), raw)
    assert.equal(store.writes.length, 0)
  }
})

test('legacy migration requires missing modern data and leaves the legacy raw value intact', () => {
  const raw = JSON.stringify({ ...createBinderPage(1), name: 'Legacy' })
  const store = memory({ [storageKeys.legacyBinder]: raw })
  const loaded = loadBinder(store)
  assert.equal(loaded.status, 'valid')
  assert.equal(loaded.key, storageKeys.binder)
  if (loaded.status !== 'valid') throw Error('Expected valid')
  assert.equal(loaded.value[0].name, 'Legacy')
  assert.equal(saveJson(loaded, loaded.value, store), null)
  assert.equal(store.data.get(storageKeys.legacyBinder), raw)
})

test('invalid legacy saves block saving defaults to the modern binder key', () => {
  for (const raw of ['broken', '{}', JSON.stringify(createBinderPage(2))]) {
    const store = memory({ [storageKeys.legacyBinder]: raw })
    const loaded = loadBinder(store)
    assert.equal(loaded.status, 'invalid')
    assert.ok(saveJson(loaded, completeBinder([]), store))
    assert.equal(store.data.get(storageKeys.legacyBinder), raw)
    assert.equal(store.data.has(storageKeys.binder), false)
  }
})

test('read failures are unavailable and block writes, including localStorage getter failures', () => {
  const store = { getItem() { throw Error('Denied') }, setItem() { throw Error('Must not write') } }
  assert.equal(readText(storageKeys.page, store).status, 'unavailable')
  const loaded = loadBinder(store)
  assert.equal(loaded.status, 'unavailable')
  assert.ok(saveJson(loaded, [], store))
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { get localStorage() { throw Error('SecurityError') } } })
  try { assert.equal(readText('test').status, 'unavailable') } finally { Reflect.deleteProperty(globalThis, 'window') }
})

test('write quota failures preserve old data and allow a later retry of in-memory changes', () => {
  const store = memory({ [storageKeys.collection]: '[]' })
  const loaded = loadJson(storageKeys.collection, isCollection, store)
  const failed = { getItem: store.getItem, setItem() { throw Error('QuotaExceededError') } }
  assert.ok(saveJson(loaded, [card], failed))
  assert.equal(loaded.raw, '[]')
  assert.equal(store.data.get(storageKeys.collection), '[]')
  assert.equal(saveJson(loaded, [card], store), null)
})

test('changed storage is never overwritten and collection/binder saves are independent', () => {
  const store = memory({ [storageKeys.collection]: '[]' })
  const collection = loadJson(storageKeys.collection, isCollection, store)
  const binder = loadBinder(store)
  store.data.set(storageKeys.collection, '{new-invalid-data')
  assert.ok(saveJson(collection, [card], store))
  assert.equal(store.data.get(storageKeys.collection), '{new-invalid-data')
  assert.equal(saveJson(binder, completeBinder([]), store), null)
})

test('serialization failures and preference storage failures return errors', () => {
  const store = memory()
  const loaded = readText('test', store)
  assert.ok(saveJson(loaded, 1n, store))
  assert.ok(saveText(loaded, 'true', { getItem() { throw Error('Denied') }, setItem() {} }))
  assert.equal(store.writes.length, 0)
})
