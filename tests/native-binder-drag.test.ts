import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import { BINDER_DRAG_TYPE, createNativeBinderDrag } from '../src/services/nativeBinderDrag.ts'
import { createBinderPage, storageKeys } from '../src/services/storage.ts'

class Transfer {
  data = new Map<string, string>()
  protected = false
  effectAllowed = 'all'
  dropEffect = 'none'
  get types() { return [...this.data.keys()] }
  setData(type: string, value: string) { this.data.set(type, value) }
  getData(type: string) { if (this.protected) throw Error('Protected drag data'); return this.data.get(type) ?? '' }
}
const foreign = (type = 'text/plain') => {
  const transfer = new Transfer()
  transfer.setData(type, type === 'text/uri-list' ? 'https://example.test/foreign-image.png' : 'foreign payload')
  return transfer
}
const owner = () => ({ isConnected: true })

// Test the protected dragover phase separately from the readable drop phase.
test('native session adds only an opaque marker and allows protected dragover without reading payload data', () => {
  const session = createNativeBinderDrag(), transfer = foreign('text/uri-list')
  assert.equal(session.start('page-1-slot-1', transfer, owner()), true)
  assert.equal(transfer.getData('text/uri-list'), 'https://example.test/foreign-image.png')
  assert.ok(transfer.getData(BINDER_DRAG_TYPE))
  assert.ok(!transfer.getData(BINDER_DRAG_TYPE).includes('page-1-slot-1'))
  transfer.protected = true; assert.equal(session.accepts(transfer), true)
  transfer.protected = false; assert.equal(session.take(transfer), 'page-1-slot-1')
  assert.equal(session.take(transfer), null); assert.equal(session.accepts(transfer), false)
})

test('foreign formats, a forged marker, previous session payloads and another App session are rejected', () => {
  for (const type of ['text/plain', 'text/uri-list', 'text/html', 'Files', 'application/json']) {
    const session = createNativeBinderDrag(), internal = new Transfer()
    session.start('page-1-slot-1', internal, owner())
    const external = foreign(type)
    assert.equal(session.accepts(external), false)
    assert.equal(session.take(external), null)
    assert.equal(session.take(internal), null, 'rejection must consume the active session')
  }
  const session = createNativeBinderDrag(), first = new Transfer(), next = new Transfer()
  session.start('page-1-slot-1', first, owner()); session.end()
  session.start('page-1-slot-2', next, owner())
  assert.notEqual(first.getData(BINDER_DRAG_TYPE), next.getData(BINDER_DRAG_TYPE))
  assert.equal(session.take(first), null)
  assert.equal(session.take(next), null)
  const other = createNativeBinderDrag(), otherTransfer = new Transfer()
  other.start('page-1-slot-1', otherTransfer, owner())
  assert.equal(session.take(otherTransfer), null)
  session.start('page-1-slot-1', next, owner())
  const forged = foreign(BINDER_DRAG_TYPE)
  assert.equal(session.take(forged), null)
  assert.equal(session.take(next), null)
})

test('detached sources and unreadable drop payloads cannot be accepted or leave reusable drag state', () => {
  const session = createNativeBinderDrag(), transfer = new Transfer(), source = owner()
  session.start('page-1-slot-1', transfer, source); source.isConnected = false
  assert.equal(session.accepts(transfer), false); assert.equal(session.take(transfer), null)
  source.isConnected = true; assert.equal(session.take(transfer), null)
  session.start('page-1-slot-1', transfer, source); transfer.protected = true
  assert.equal(session.take(transfer), null)
  transfer.protected = false; assert.equal(session.take(transfer), null)
  assert.equal(session.start('page-1-slot-1', transfer, { isConnected: false }), false)
})

const firstCard = {
  id: 'pika-normal', cardId: 'pika', name: 'Pikachu', image: 'https://example.test/pika', localId: '25',
  set: { id: 'set', name: 'Set', preserved: 'set metadata' },
  variant: { variantId: 'normal', type: 'normal', size: 'standard', stamp: ['staff'] },
  preserved: { placement: 'exact original object' },
}
const secondCard = { ...firstCard, id: 'pika-holo', variant: { ...firstCard.variant, variantId: 'holo', type: 'holo' } }
function fixture() {
  const page = createBinderPage(1)
  page.slots[0] = { ...page.slots[0], card: firstCard, preserved: 'source slot metadata' } as any
  page.slots[1] = { ...page.slots[1], card: secondCard, preserved: 'target slot metadata' } as any
  return { [storageKeys.binder]: JSON.stringify([page]), [storageKeys.collection]: JSON.stringify([{ ...firstCard, quantity: 3 }]) }
}
function nodes(value: any): any[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(nodes)
  return [value, ...nodes(value.props?.children)]
}

// Exercise App's actual event wrappers, shared move/swap handler and autosave effects.
function app() {
  const data = new Map(Object.entries(fixture())), states: any[] = [], refs: any[] = [], effects: any[] = []
  const windowListeners = new Map<string, Set<(event: any) => void>>(), documentListeners = new Map<string, Set<(event: any) => void>>()
  const add = (map: typeof windowListeners) => (type: string, fn: any) => { if (!map.has(type)) map.set(type, new Set()); map.get(type)!.add(fn) }
  const remove = (map: typeof windowListeners) => (type: string, fn: any) => map.get(type)?.delete(fn)
  const window = { localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener: add(windowListeners), removeEventListener: remove(windowListeners) }
  const document = { hidden: false, addEventListener: add(documentListeners), removeEventListener: remove(documentListeners) }
  let cursor = 0, refCursor = 0, effectCursor = 0, tree: any
  const pending: Array<() => void> = []
  function execute(file: string) {
    const exports: any = {}
    runInNewContext(transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }).outputText, {
      exports, window, document, AbortController,
      require(name: string) {
        if (['storage', 'latestRequest', 'nativeBinderDrag', 'accessibility'].some(service => name === `./services/${service}`)) return execute(`src/${name.slice(2)}.ts`)
        if (name === 'react') return {
          useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
            return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
          useRef(initial: any) { const index = refCursor++; return refs[index] ??= { current: initial } },
          useEffectEvent: (fn: any) => fn,
          useEffect(fn: () => any, deps: any[]) {
            const index = effectCursor++, previous = effects[index]
            if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
              pending.push(() => { previous?.cleanup?.(); effects[index] = { deps, cleanup: fn() } })
            }
          },
        }
        if (name === 'react/jsx-runtime') return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) }
        return { __esModule: true, default: name }
      },
    })
    return exports
  }
  const App = execute('src/App.tsx').default
  function render() { cursor = 0; refCursor = 0; effectCursor = 0; tree = App(); while (pending.length) pending.shift()!() }
  const spread = () => nodes(tree).find(n => n.type === './components/BinderSpread').props
  const binder = () => data.get(storageKeys.binder)
  const slot = (index: number) => JSON.parse(binder()!)[0].slots[index - 1]
  const event = (transfer: Transfer) => ({ dataTransfer: transfer, currentTarget: owner(), prevented: false,
    preventDefault() { this.prevented = true } })
  function start(index = 1, transfer = new Transfer()) { const e = event(transfer); spread().onDragStart(`page-1-slot-${index}`, e); render(); return { transfer, event: e } }
  function drop(index: number, transfer: Transfer) { const e = event(transfer); spread().onDrop(`page-1-slot-${index}`, e); render(); return e }
  function dispatch(type: string, event = {}) { for (const fn of windowListeners.get(type) ?? []) fn(event); render() }
  render()
  return { data, binder, slot, spread, event, start, drop, dispatch, render,
    hidden() { document.hidden = true; for (const fn of documentListeners.get('visibilitychange') ?? []) fn({}); render() },
    unmount() { effects.forEach(effect => effect.cleanup?.()) }, windowListeners,
  }
}

for (const [type, cancellation] of [['text/plain', 'dragend'], ['text/uri-list', 'escape']] as const) {
  test(`cancelled native drag followed by external ${type === 'text/plain' ? 'text' : 'image'} drop leaves every placement and quantity unchanged`, () => {
    const ui = app(), binder = ui.binder(), collection = ui.data.get(storageKeys.collection)
    ui.start()
    ui.dispatch(cancellation === 'escape' ? 'keydown' : 'dragend', cancellation === 'escape' ? { key: 'Escape' } : {})
    const external = foreign(type), over = ui.event(external)
    ui.spread().onDragOver(over)
    assert.equal(over.prevented, true, 'foreign URL drops must not navigate the page')
    assert.equal(external.dropEffect, 'none')
    assert.equal(ui.drop(3, external).prevented, true)
    assert.equal(ui.binder(), binder); assert.equal(ui.data.get(storageKeys.collection), collection)
  })
}

test('external drops without an active drag, or during an unrelated active session, cannot move cards or retain the old payload', () => {
  for (const type of ['text/plain', 'text/uri-list', 'text/html', 'Files', BINDER_DRAG_TYPE]) {
    const ui = app(), before = ui.binder(), external = foreign(type)
    ui.drop(3, external); assert.equal(ui.binder(), before)
    const { transfer } = ui.start()
    ui.drop(3, external); assert.equal(ui.binder(), before)
    ui.drop(3, transfer); assert.equal(ui.binder(), before)
  }
})

for (const destination of [2, 3]) test(`successful internal ${destination === 2 ? 'swap' : 'move'} preserves exact metadata, slots, quantities and consumes its payload`, () => {
  const ui = app(), collection = ui.data.get(storageKeys.collection)
  const sourceCard = ui.spread().rightPage.slots[0].card
  const targetCard = ui.spread().rightPage.slots[destination - 1].card
  const { transfer } = ui.start()
  assert.equal(transfer.effectAllowed, 'move')
  transfer.protected = true; const over = ui.event(transfer); ui.spread().onDragOver(over)
  assert.equal(over.prevented, true); assert.equal(transfer.dropEffect, 'move')
  transfer.protected = false; ui.drop(destination, transfer)
  assert.equal(ui.spread().rightPage.slots[destination - 1].card, sourceCard)
  assert.equal(ui.spread().rightPage.slots[0].card, targetCard)
  assert.deepEqual(ui.slot(destination).card, firstCard)
  assert.deepEqual(ui.slot(1).card, destination === 2 ? secondCard : null)
  assert.equal(ui.slot(1).preserved, 'source slot metadata')
  if (destination === 2) assert.equal(ui.slot(2).preserved, 'target slot metadata')
  assert.equal(ui.data.get(storageKeys.collection), collection)
  const after = ui.binder()
  ui.drop(destination === 2 ? 3 : 2, transfer); assert.equal(ui.binder(), after)
  ui.dispatch('dragend'); assert.equal(ui.binder(), after)
})

test('consecutive native drags and reversing a swap work without an intervening hover or stale source', () => {
  const ui = app()
  ui.drop(2, ui.start().transfer)
  ui.dispatch('dragend')
  ui.drop(1, ui.start(2).transfer)
  assert.deepEqual(ui.slot(1).card, firstCard); assert.deepEqual(ui.slot(2).card, secondCard)
  ui.drop(3, ui.start(1).transfer)
  assert.equal(ui.slot(1).card, null); assert.deepEqual(ui.slot(3).card, firstCard)
})

for (const reason of ['dragend', 'Escape', 'blur', 'hidden'] as const) test(`${reason} cancellation does not change placement data and invalidates the internal payload`, () => {
  const ui = app(), before = ui.binder(), { transfer } = ui.start()
  if (reason === 'Escape') ui.dispatch('keydown', { key: 'Escape' })
  else if (reason === 'hidden') ui.hidden()
  else ui.dispatch(reason)
  ui.drop(3, transfer)
  assert.equal(ui.binder(), before)
})

test('same-pocket, invalid-target and unreadable payload drops cannot leave a drag source available for later drops', () => {
  for (const destination of [1, 99]) {
    const ui = app(), before = ui.binder(), { transfer } = ui.start()
    ui.drop(destination, transfer); ui.drop(3, transfer)
    assert.equal(ui.binder(), before)
  }
  const ui = app(), before = ui.binder(), { transfer } = ui.start()
  transfer.protected = true; ui.drop(3, transfer)
  transfer.protected = false; ui.drop(3, transfer)
  assert.equal(ui.binder(), before)
  const missing = ui.event(null as any)
  assert.doesNotThrow(() => ui.spread().onDragOver(missing))
  assert.doesNotThrow(() => ui.spread().onDrop('page-1-slot-3', missing))
  ui.render(); assert.equal(ui.binder(), before)
})

test('an empty source cannot start a drag; unmount removes global listeners and invalidates an outstanding session', () => {
  const ui = app(), before = ui.binder()
  const invalid = ui.start(3)
  assert.equal(invalid.event.prevented, true); assert.equal(invalid.transfer.types.length, 0)
  const { transfer } = ui.start()
  const lateDrop = ui.spread().onDrop
  ui.unmount()
  assert.ok([...ui.windowListeners.values()].every(listeners => listeners.size === 0))
  lateDrop('page-1-slot-3', ui.event(transfer)); ui.render()
  assert.equal(ui.binder(), before)
})
