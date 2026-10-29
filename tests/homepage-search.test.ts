import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'

function deferred() {
  let resolve!: (value: unknown) => void
  let reject!: (error: unknown) => void
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const card = (id: string) => ({ id, name: id, localId: id })
const details = (id: string) => ({ ...card(id), set: { id: 'set', name: 'Set' }, variants_detailed: [
  { variantId: `${id}-normal`, type: 'normal', size: 'normal' },
  { variantId: `${id}-holo`, type: 'holo', size: 'normal' },
] })
function appHarness() {
  const states: unknown[] = [], effects: Array<() => unknown> = []
  let cursor = 0, first = true, tree: any
  const calls: Array<{ kind: string; query: string; signal: AbortSignal } & ReturnType<typeof deferred>> = []
  const request = (kind: string) => (query: string, signal: AbortSignal) => {
    const call = { kind, query, signal, ...deferred() }; calls.push(call); return call.promise
  }
  const storage = new Map<string, string>()
  const window = { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }
  const execute = (file: string) => {
    const exports: Record<string, any> = {}
    runInNewContext(transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }).outputText, {
      exports, window, AbortController, document: { addEventListener() {}, removeEventListener() {} },
      require(name: string) {
        if (name === './services/storage') return execute('src/services/storage.ts')
        if (name === './services/latestRequest') return execute('src/services/latestRequest.ts')
        if (name === './services/tcgdex') return { searchCards: request('search'), getCardById: request('detail') }
        if (name === 'react') return {
          useState(initial: any) { const index = cursor++; if (first) states[index] = typeof initial === 'function' ? initial() : initial;
            return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
          useRef(initial: unknown) { const index = cursor++; if (first) states[index] = { current: initial }; return states[index] },
          useEffect(fn: () => unknown) { if (first) effects.push(fn) }, useEffectEvent: (fn: unknown) => fn,
        }
        if (name === 'react/jsx-runtime') return { jsx: (type: unknown, props: unknown, key: unknown) => ({ type, props, key }), jsxs: (type: unknown, props: unknown, key: unknown) => ({ type, props, key }) }
        return { __esModule: true, default: name }
      },
    })
    return exports
  }
  const App = execute('src/App.tsx').default
  function render() { cursor = 0; tree = App(); first = false; return tree }
  function nodes(value: any): any[] {
    if (!value || typeof value !== 'object') return []
    if (Array.isArray(value)) return value.flatMap(v => nodes(v))
    return [value, ...nodes(value.props?.children)]
  }
  function content(value: any): string {
    if (value == null || typeof value === 'boolean') return ''
    if (Array.isArray(value)) return value.map(content).join('')
    return typeof value === 'object' ? content(value.props?.children) : String(value)
  }
  const find = (predicate: (node: any) => boolean) => nodes(tree).find(predicate)
  const input = () => find(n => n.props?.['aria-label'] === 'Search Pokémon cards')
  const clear = () => find(n => n.props?.className === 'search-clear-button')
  function search(query: string) {
    input().props.onChange({ target: { value: query } }); render()
    find(n => n.props?.className === 'search-bar').props.onSubmit({ preventDefault() {} }); render()
  }
  function choose(id: string) { find(n => n.type === './components/CardSearchResult' && n.props.card.id === id).props.onAdd(card(id)); render() }
  render()
  const cleanups = effects.map(fn => fn())
  return { calls, search, choose, render, input, clear, find,
    results: () => nodes(tree).filter(n => n.type === './components/CardSearchResult').map(n => n.props.card.id),
    text: () => content(tree), loading: () => find(n => n.props?.className === 'search-bar').props['aria-busy'],
    unmount: () => cleanups.forEach(fn => { if (typeof fn === 'function') fn() }),
  }
}
const settle = () => new Promise(resolve => setImmediate(resolve))

test('out-of-order results and stale finally blocks cannot replace the latest search or loading state', async () => {
  const app = appHarness(); app.search('old'); app.search('new')
  assert.equal(app.calls[0].signal.aborted, true)
  app.calls[0].resolve([card('old')]); await settle(); app.render()
  assert.equal(app.loading(), true); assert.deepEqual(app.results(), [])
  app.calls[1].resolve([card('new')]); await settle(); app.render()
  assert.deepEqual(app.results(), ['new']); assert.equal(app.loading(), false)
})

test('Clear invalidates pending responses even when the search input was emptied during loading', async () => {
  const app = appHarness(); app.search('Pikachu')
  app.input().props.onChange({ target: { value: '' } }); app.render()
  assert.ok(app.clear()); app.clear().props.onClick(); app.render()
  app.calls[0].resolve([card('late')]); await settle(); app.render()
  assert.equal(app.calls[0].signal.aborted, true); assert.deepEqual(app.results(), []); assert.equal(app.loading(), false)
  assert.ok(!app.text().includes('No cards found'))
})

test('three rapid submissions accept only the last response and ignore stale errors', async () => {
  const app = appHarness(); app.search('a'); app.search('b'); app.search('c')
  app.calls[2].resolve([card('c')]); app.calls[1].reject(Error('offline')); app.calls[0].resolve([card('a')])
  await settle(); app.render(); assert.deepEqual(app.results(), ['c']); assert.ok(!app.text().includes('Unable to search'))
})

test('network failures show helpful feedback; intentional cancellation is not an error', async () => {
  const app = appHarness(); app.search('a'); app.calls[0].reject(Error('offline')); await settle(); app.render()
  assert.ok(app.text().includes('Unable to search Pokémon')); assert.equal(app.loading(), false)
  app.search('b'); app.clear().props.onClick(); app.calls[1].reject({ name: 'AbortError' }); await settle(); app.render()
  assert.ok(!app.text().includes('Unable to search')); assert.equal(app.loading(), false)
})

test('empty results name the submitted query, not subsequently typed text; typing alone makes no requests', async () => {
  const app = appHarness(); app.search('missing'); app.input().props.onChange({ target: { value: 'next' } }); app.render()
  assert.equal(app.calls.length, 1); app.calls[0].resolve([]); await settle(); app.render()
  assert.ok(app.text().includes('No cards found for “missing”'))
})

test('rapid card selections show only the latest details and key the modal for variant reset', async () => {
  const app = appHarness(); app.search('cards'); app.calls[0].resolve([card('a'), card('b')]); await settle(); app.render()
  app.choose('a'); app.choose('b'); assert.equal(app.calls[1].signal.aborted, true)
  app.calls[2].resolve(details('b')); app.calls[1].resolve(details('a')); await settle(); app.render()
  let modal = app.find(n => n.type === './components/CardDetailsModal')
  assert.equal(modal.props.card.id, 'b'); assert.equal(modal.key, 'b'); assert.equal(modal.props.card.variants_detailed[0].variantId, 'b-normal')
  app.choose('a'); app.calls[3].resolve(details('a')); await settle(); app.render()
  modal = app.find(n => n.type === './components/CardDetailsModal')
  assert.equal(modal.key, 'a'); assert.equal(modal.props.card.variants_detailed[0].variantId, 'a-normal')
})

test('canceling detail loading or clearing search prevents late modal opening', async () => {
  for (const action of ['cancel', 'clear']) {
    const app = appHarness(); app.search('cards'); app.calls[0].resolve([card('a')]); await settle(); app.render(); app.choose('a')
    if (action === 'clear') app.clear().props.onClick()
    else app.find(n => n.type === 'button' && n.props.children === 'Cancel').props.onClick()
    app.calls[1].resolve(details('a')); await settle(); app.render()
    assert.equal(app.calls[1].signal.aborted, true); assert.equal(app.find(n => n.type === './components/CardDetailsModal'), undefined)
  }
})

test('modal dismissal invalidates the detail request and detail failures provide feedback', async () => {
  const app = appHarness(); app.search('cards'); app.calls[0].resolve([card('a')]); await settle(); app.render(); app.choose('a')
  app.calls[1].resolve(details('a')); await settle(); app.render()
  app.find(n => n.type === './components/CardDetailsModal').props.onClose(); app.render()
  assert.equal(app.calls[1].signal.aborted, true)
  app.choose('a'); app.calls[2].reject(Error('offline')); await settle(); app.render()
  assert.ok(app.text().includes('Unable to load card details'))
})

test('Grid/List survives searches and unmount invalidates both request channels', async () => {
  const app = appHarness(); app.search('cards'); app.calls[0].resolve([card('a')]); await settle(); app.render()
  app.find(n => n.type === 'button' && n.props.children === '☰ List').props.onClick(); app.render()
  app.choose('a'); app.search('next'); app.unmount()
  for (const request of app.calls) assert.equal(request.signal.aborted, true)
  app.calls[1].resolve(details('a')); app.calls[2].resolve([card('late')]); await settle(); app.render()
  assert.deepEqual(app.results(), []); assert.ok(app.find(n => n.props?.className === 'card-grid main-search-list-view'))
})
