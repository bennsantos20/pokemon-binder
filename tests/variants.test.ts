import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveVariants, UNSPECIFIED_VARIANT, variantOptionLabel, VARIANTS_UNAVAILABLE_MESSAGE } from '../src/services/variants.ts'
import { completeBinder, isBinderPages, isCollection, storageKeys } from '../src/services/storage.ts'
import { exportBackup, importBackup, parseBackup, snapshot } from '../src/services/backup.ts'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'

const confirmed = { variantId: 'api-holo', type: 'holo', size: 'standard', stamp: ['staff'], extra: { preserved: true } }

test('missing, null, empty, non-array and malformed metadata require explicit unspecified selection', () => {
  for (const value of [undefined, null, [], {}, 'normal', 1, [null], [{}], [{ variantId: '', type: 'normal', size: 'standard' }],
    [{ variantId: 'x', type: 'holo' }], [{ variantId: 'x', type: [], size: 'standard' }], [{ variantId: 'x', type: 'holo', size: 2 }]]) {
    const result = resolveVariants(value)
    assert.equal(result.unavailable, true)
    assert.equal(result.initialSelection, null)
    assert.deepEqual(result.variants, [UNSPECIFIED_VARIANT])
  }
  assert.match(UNSPECIFIED_VARIANT.variantId, /^urn:pokemon-binder:/)
  assert.equal(UNSPECIFIED_VARIANT.type, 'Printing Unspecified')
})

test('usable normal, reverse, holo and specialty entries retain their original identities and extra metadata', () => {
  for (const type of ['normal', 'reverse', 'holo', 'metal', 'lenticular']) {
    const variant = { ...confirmed, type }
    const result = resolveVariants([null, variant, {}])
    assert.equal(result.unavailable, false)
    assert.equal(result.variants[0], variant)
    assert.equal(result.initialSelection, variant)
    assert.deepEqual(variant.extra, { preserved: true })
  }
})

test('duplicate IDs and reserved local namespace cannot be mistaken for confirmed API printings', () => {
  assert.equal(resolveVariants([confirmed, { ...confirmed, foil: 'cosmos' }]).unavailable, true)
  assert.equal(resolveVariants([{ ...confirmed, variantId: UNSPECIFIED_VARIANT.variantId }]).initialSelection, null)
})

test('labels distinguish subtype, stamps, foil and languages and fall back to real IDs', () => {
  const a = { ...confirmed, subtype: 'shadowless', foil: 'cosmos', languages: ['en'] }
  const b = { ...confirmed, variantId: 'other', subtype: 'unlimited' }
  const label = variantOptionLabel(a, [a, b])
  assert.match(label, /shadowless/); assert.match(label, /staff/); assert.match(label, /cosmos/); assert.match(label, /languages: en/)
  const same = { ...confirmed, variantId: 'another-id' }
  assert.match(variantOptionLabel(confirmed, [confirmed, same]), /ID: api-holo/)
  assert.equal(variantOptionLabel(UNSPECIFIED_VARIANT, [UNSPECIFIED_VARIANT]), 'Printing Unspecified')
})

function modal(raw: unknown) {
  let states: any[] = [], cursor = 0, tree: any
  const added: any[] = []
  let card: any = { id: 'a', name: 'A', localId: '1', variants_detailed: raw }
  function execute(file: string) {
    const exports: Record<string, any> = {}
    runInNewContext(transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }).outputText, {
      exports, require(name: string) {
        if (name === '../services/variants') return execute('src/services/variants.ts')
        if (name === 'react') return { useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (value: any) => { states[index] = value }] } }
        if (name === 'react/jsx-runtime') return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) }
        return {}
      },
    })
    return exports
  }
  const Component = execute('src/components/CardDetailsModal.tsx').default
  function render() { cursor = 0; tree = Component({ card, onClose() {}, onAdd: (...args: any[]) => added.push(args) }) }
  function nodes(v: any): any[] { if (!v || typeof v !== 'object') return []; if (Array.isArray(v)) return v.flatMap(nodes); return [v, ...nodes(v.props?.children)] }
  const find = (fn: (n: any) => boolean) => nodes(tree).find(fn)
  render()
  return { find, added, render, text: () => JSON.stringify(tree), switchCard(metadata: unknown) {
    // App keys the actual modal by card ID, giving each card fresh hook state.
    states = []; card = { ...card, id: 'b', variants_detailed: metadata }; render()
  } }
}

test('details modal safely renders each unavailable case and blocks Add until deliberate selection', () => {
  for (const value of [undefined, null, [], {}, 'bad', [null, {}]]) {
    const ui = modal(value)
    assert.ok(ui.text().includes(VARIANTS_UNAVAILABLE_MESSAGE))
    assert.equal(ui.find(n => n.props?.className === 'confirm-add-button').props.disabled, true)
    ui.find(n => n.props?.className === 'variant-option').props.onClick(); ui.render()
    assert.equal(ui.find(n => n.props?.className === 'confirm-add-button').props.disabled, false)
    ui.find(n => n.props?.className === 'confirm-add-button').props.onClick()
    assert.equal(ui.added[0][1].variantId, UNSPECIFIED_VARIANT.variantId)
  }
})

test('switching to a new card does not carry an unspecified selection forward', () => {
  const ui = modal(null)
  ui.find(n => n.props?.className === 'variant-option').props.onClick(); ui.render()
  ui.switchCard([])
  assert.equal(ui.find(n => n.props?.className === 'confirm-add-button').props.disabled, true)
  ui.switchCard([confirmed])
  assert.equal(ui.find(n => n.props?.className === 'variant-option selected').props['aria-pressed'], true)
})

test('unspecified cards round-trip through current storage/backup formats without conversion', () => {
  const owned = { id: `card-${UNSPECIFIED_VARIANT.variantId}`, cardId: 'card', name: 'Card', localId: '1',
    set: { id: 'set', name: 'Set' }, variant: UNSPECIFIED_VARIANT, quantity: 2 }
  const pages = completeBinder([]); pages[0].slots[0].card = owned
  assert.equal(isCollection([owned]), true); assert.equal(isBinderPages(pages), true)
  const backup = parseBackup(exportBackup([owned], pages, { currentSpread: 0, mobilePage: 1, collectionExpanded: true }))
  const map = new Map<string, string>()
  const store = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value), removeItem: (key: string) => { map.delete(key) } }
  assert.equal(importBackup(backup, snapshot(store), store).ok, true)
  assert.equal(JSON.parse(map.get(storageKeys.collection)!)[0].variant.variantId, UNSPECIFIED_VARIANT.variantId)
  assert.equal(JSON.parse(map.get(storageKeys.binder)!)[0].slots[0].card.variant.variantId, UNSPECIFIED_VARIANT.variantId)
  resolveVariants([confirmed])
  assert.equal(owned.variant.variantId, UNSPECIFIED_VARIANT.variantId)
})
