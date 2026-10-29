import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'

function deferred() {
  let resolve!: (value: unknown) => void, reject!: (reason: unknown) => void
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const card = (id: string) => ({ id, name: id, localId: id })
const detail = (id: string) => ({ ...card(id), set: { id: 'set', name: 'Set' }, variants_detailed: [
  { variantId: `${id}-normal`, type: 'normal', size: 'normal' },
  { variantId: `${id}-holo`, type: 'holo', size: 'normal' },
] })
function picker() {
  const states: any[] = [], effects: Array<() => unknown> = [], listeners = new Map<string, (e: any) => void>()
  let cursor = 0, first = true, tree: any, closed = 0
  const placed: any[] = []
  const calls: Array<{ signal: AbortSignal; query: string; kind: string } & ReturnType<typeof deferred>> = []
  const fetch = (kind: string) => (query: string, signal: AbortSignal) => {
    const call = { kind, query, signal, ...deferred() }; calls.push(call); return call.promise
  }
  function execute(file: string) {
    const exports: Record<string, any> = {}
    runInNewContext(transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }).outputText, {
      exports, AbortController,
      document: { addEventListener: (name: string, fn: any) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) },
      require(name: string) {
        if (name === '../services/latestRequest') return execute('src/services/latestRequest.ts')
        if (name === '../services/tcgdex') return { searchCards: fetch('search'), getCardById: fetch('detail') }
        if (name === 'react') return {
          useState(initial: any) { const index = cursor++; if (first) states[index] = typeof initial === 'function' ? initial() : initial;
            return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
          useEffect(fn: () => unknown) { if (first) effects.push(fn) }, useEffectEvent: (fn: any) => fn,
        }
        if (name === 'react/jsx-runtime') return { jsx: (type: any, props: any, key: any) => ({ type, props, key }), jsxs: (type: any, props: any, key: any) => ({ type, props, key }) }
        return {}
      },
    })
    return exports
  }
  const Component = execute('src/components/BinderCardPicker.tsx').default
  function render() { cursor = 0; tree = Component({ slotId: 'page-1-slot-1', collection: [], onClose: () => closed++, onPlaceCard: (...args: any[]) => placed.push(args) }); first = false }
  function nodes(v: any): any[] { if (!v || typeof v !== 'object') return []; if (Array.isArray(v)) return v.flatMap(nodes); return [v, ...nodes(v.props?.children)] }
  const find = (fn: (n: any) => boolean) => nodes(tree).find(fn)
  function content(v: any): string { if (v == null || typeof v === 'boolean') return ''; if (Array.isArray(v)) return v.map(content).join(''); return typeof v === 'object' ? content(v.props?.children) : String(v) }
  function open() { find(n => n.type === 'button' && content(n).includes('Search All Cards')).props.onClick(); render() }
  function search(query: string) {
    find(n => n.props?.['aria-label'] === 'Search all Pokémon cards').props.onChange({ target: { value: query } }); render()
    find(n => n.props?.className === 'binder-card-search').props.onSubmit({ preventDefault() {} }); render()
  }
  function choose(id: string) { find(n => n.props?.className === 'binder-search-result' && n.key === id).props.onClick(); render() }
  render(); const cleanups = effects.map(fn => fn()); open()
  return { render, calls, find, search, choose, open, placed, closed: () => closed, text: () => content(tree),
    results: () => nodes(tree).filter(n => n.props?.className === 'binder-search-result').map(n => n.key),
    back: () => { find(n => n.props?.className === 'binder-picker-back').props.onClick(); render() },
    close: () => { find(n => n.props?.className === 'binder-picker-close').props.onClick(); render() },
    escape: () => listeners.get('keydown')?.({ key: 'Escape' }),
    unmount: () => cleanups.forEach(fn => { if (typeof fn === 'function') fn() }),
  }
}
const settle = () => new Promise(resolve => setImmediate(resolve))

test('rapid picker searches ignore stale responses, errors and loading cleanup', async () => {
  const ui = picker(); ui.search('a'); ui.search('b'); ui.search('c')
  assert.equal(ui.calls[0].signal.aborted, true)
  ui.calls[0].resolve([card('a')]); ui.calls[1].reject(Error('offline')); await settle(); ui.render()
  assert.ok(ui.text().includes('Searching')); assert.deepEqual(ui.results(), []); assert.ok(!ui.text().includes('Unable'))
  ui.calls[2].resolve([card('c')]); await settle(); ui.render(); assert.deepEqual(ui.results(), ['c'])
})

test('Back, Close, Escape and unmount invalidate pending picker searches', async () => {
  for (const action of ['back', 'close', 'escape', 'unmount'] as const) {
    const ui = picker(); ui.search('a'); ui[action]()
    assert.equal(ui.calls[0].signal.aborted, true)
    ui.calls[0].resolve([card('late')]); await settle(); ui.render()
    if (action === 'back') ui.open()
    assert.deepEqual(ui.results(), [])
  }
})

test('picker errors allow retry; empty results and intentional cancellation have clear feedback', async () => {
  const ui = picker(); ui.search('a'); ui.calls[0].reject(Error('offline')); await settle(); ui.render()
  assert.ok(ui.text().includes('Unable to search'))
  ui.search('b'); ui.calls[1].resolve([]); await settle(); ui.render()
  assert.ok(ui.text().includes('No cards found for “b”')); assert.ok(!ui.text().includes('Unable'))
  ui.search('c'); ui.back(); ui.calls[2].reject({ name: 'AbortError' }); await settle(); ui.render(); ui.open()
  assert.ok(!ui.text().includes('Unable'))
})

test('rapid detail selections accept only the latest Pokémon and preserve variant placement', async () => {
  const ui = picker(); ui.search('cards'); ui.calls[0].resolve([card('a'), card('b')]); await settle(); ui.render()
  ui.choose('a'); ui.choose('b'); assert.equal(ui.calls[1].signal.aborted, true)
  ui.calls[2].resolve(detail('b')); ui.calls[1].resolve(detail('a')); await settle(); ui.render()
  ui.find(n => n.props?.className === 'binder-variant-option' && n.key === 'b-holo').props.onClick(); ui.render()
  ui.find(n => n.props?.className === 'binder-place-card-button').props.onClick()
  assert.equal(ui.placed[0][0].id, 'b'); assert.equal(ui.placed[0][1].variantId, 'b-holo')
})

test('picker details cancel on Back/Close and failed details can be selected again', async () => {
  for (const action of ['back', 'close', 'escape', 'unmount'] as const) {
    const ui = picker(); ui.search('cards'); ui.calls[0].resolve([card('a')]); await settle(); ui.render(); ui.choose('a'); ui[action]()
    ui.calls[1].resolve(detail('a')); await settle(); ui.render()
    assert.equal(ui.calls[1].signal.aborted, true); assert.ok(!ui.find(n => n.props?.className === 'binder-placement-preview'))
  }
  const ui = picker(); ui.search('cards'); ui.calls[0].resolve([card('a')]); await settle(); ui.render(); ui.choose('a')
  ui.calls[1].reject(Error('offline')); await settle(); ui.render(); assert.ok(ui.text().includes('Unable to load'))
  ui.choose('a'); ui.calls[2].resolve(detail('a')); await settle(); ui.render(); assert.ok(ui.find(n => n.props?.className === 'binder-placement-preview'))
})

test('picker Grid/List selection survives request changes and Back to Results', async () => {
  const ui = picker(); ui.find(n => n.type === 'button' && n.props.children === 'List').props.onClick(); ui.render()
  ui.search('cards'); ui.calls[0].resolve([card('a')]); await settle(); ui.render(); ui.choose('a')
  ui.calls[1].resolve(detail('a')); await settle(); ui.render(); ui.back()
  assert.ok(ui.find(n => String(n.props?.className).includes('binder-search-results-list')))
})
