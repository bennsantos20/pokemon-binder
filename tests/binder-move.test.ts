import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import { completeBinder, createBinderPage, storageKeys } from '../src/services/storage.ts'
import { UNSPECIFIED_VARIANT } from '../src/services/variants.ts'

const firstCard = {
  id: 'pikachu-normal', cardId: 'pikachu', name: 'Pikachu', localId: '25', image: 'https://example.test/pikachu',
  set: { id: 'set', name: 'Original Set', extra: 'keep set metadata' },
  variant: { variantId: 'normal', type: 'normal', size: 'standard', stamp: ['staff'] },
  extra: { placement: 'keep original metadata' },
}
const secondCard = {
  ...firstCard, id: `charizard-${UNSPECIFIED_VARIANT.variantId}`, cardId: 'charizard', name: 'Charizard',
  image: 'https://example.test/charizard', variant: { ...UNSPECIFIED_VARIANT, extra: 'keep printing metadata' },
}
function fixture(occupied = true, destinationPage = 1, sourcePage = 1, pageCount = 40) {
  const pages = Array.from({ length: pageCount }, (_, index) => ({ ...createBinderPage(index + 1), note: 'keep page metadata' }))
  pages[sourcePage - 1].slots[0] = { ...pages[sourcePage - 1].slots[0], card: firstCard, note: 'source slot metadata' } as any
  pages[destinationPage - 1].slots[1] = { ...pages[destinationPage - 1].slots[1], card: occupied ? secondCard : null, note: 'destination slot metadata' } as any
  const collection = [{ ...firstCard, quantity: 3 }, { ...firstCard,
    id: 'pikachu-holo', variant: { ...firstCard.variant, variantId: 'holo', type: 'holo' }, quantity: 5 }]
  return { [storageKeys.binder]: JSON.stringify(pages), [storageKeys.collection]: JSON.stringify(collection) }
}
function nodes(value: any): any[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(nodes)
  return [value, ...nodes(value.props?.children)]
}
function content(value: any): string {
  if (value == null || typeof value === 'boolean') return ''
  if (Array.isArray(value)) return value.map(content).join('')
  return typeof value === 'object' ? content(value.props?.children) : String(value)
}
const jsx = (type: any, props: any, key: any) => ({ type, props, key })
const options = { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }

// Execute the actual App handlers and autosave effects against isolated hook/storage doubles.
function app(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial)), states: any[] = [], refs: any[] = [], effectRecords: any[] = []
  let cursor = 0, refCursor = 0, effectCursor = 0, tree: any
  const requests: AbortSignal[] = []
  const pendingEffects: Array<() => void> = []
  const window = {
    localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  }
  function execute(file: string) {
    const exports: any = {}
    runInNewContext(transpileModule(readFileSync(file, 'utf8'), options).outputText, {
      exports, window, AbortController, document: { addEventListener() {}, removeEventListener() {} },
      require(name: string) {
        if (name === './services/storage') return execute('src/services/storage.ts')
        if (name === './services/latestRequest') return execute('src/services/latestRequest.ts')
        if (name === './services/tcgdex') return { getCardById: (_id: string, signal: AbortSignal) => {
          requests.push(signal); return new Promise(() => {})
        } }
        if (name === 'react') return {
          useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
            return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
          useRef(initial: any) { const index = refCursor++; return refs[index] ??= { current: initial } },
          useEffectEvent: (fn: any) => fn,
          useEffect(fn: () => any, deps: any[]) {
            const index = effectCursor++, previous = effectRecords[index]
            if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
              pendingEffects.push(() => { previous?.cleanup?.(); effectRecords[index] = { deps, cleanup: fn() } })
            }
          },
        }
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
        return { __esModule: true, default: name }
      },
    })
    return exports
  }
  const App = execute('src/App.tsx').default
  function render() { cursor = 0; refCursor = 0; effectCursor = 0; tree = App(); while (pendingEffects.length) pendingEffects.shift()!() }
  const find = (type: string) => nodes(tree).find(n => n.type === `./components/${type}`)
  const spread = () => find('BinderSpread').props
  const dialog = () => find('CollectionBinderPlacement')?.props
  const pages = () => JSON.parse(data.get(storageKeys.binder)!)
  const slot = (id: string) => pages().flatMap((page: any) => page.slots).find((item: any) => item.id === id)
  function open(source = 'page-1-slot-1') {
    spread().onSlotClick(source); render(); find('BinderCardActions').props.onMove(); render()
  }
  render()
  return { data, requests, render, find, spread, dialog, pages, slot, open }
}

function selector(initialProps: any) {
  let props = initialProps, cursor = 0, tree: any, modalClose: () => void = () => {}
  const states: any[] = []
  const exports: any = {}
  runInNewContext(transpileModule(readFileSync('src/components/CollectionBinderPlacement.tsx', 'utf8'), options).outputText, {
    exports, document: { addEventListener() {}, removeEventListener() {} },
    require(name: string) {
      if (name === '../hooks/useModalFocus') return { useModalFocus: (close: () => void) => { modalClose = close; return { current: null } } }
      if (name === './AccessibleDialog') return { __esModule: true, default: 'AccessibleDialog' }
      if (name === 'react') return {
        useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = initial
          return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
        useRef: () => ({ current: null }), useEffect() {},
      }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      return {}
    },
  })
  const find = (predicate: (n: any) => boolean) => nodes(tree).find(predicate)
  function render() { cursor = 0; tree = exports.default(props) }
  const button = (text: string) => find(n => n.type === 'button' && content(n) === text)
  const pocket = (index: number) => nodes(tree).filter(n => n.props?.className?.includes('collection-placement-pocket '))[index - 1]
  const confirmation = () => find(n => n.type === 'AccessibleDialog')
  render()
  return { render, button, pocket, find, confirmation, text: () => content(tree),
    update(next: any) { props = next; render() },
    select(index: number) { pocket(index).props.onClick(); render() },
    review() { const review = button('Review Move') ?? button('Review Swap'); assert.ok(review); review.props.onClick(); render() },
    confirm() { const result = button('Confirm Move') ?? button('Confirm Swap'); result.props.onClick(); render() },
    escape() { (confirmation()?.props.onClose ?? modalClose)(); render() },
    page(number: number) {
      find(n => n.props?.className?.includes('collection-placement-page-trigger ')).props.onClick(); render()
      find(n => n.props?.['aria-label'] === 'Search binder pages').props.onChange({ target: { value: String(number) } }); render()
      find(n => n.type === 'button' && n.key === `page-${number}`).props.onClick(); render()
    },
  }
}

for (const crossPage of [false, true]) for (const occupied of [false, true]) {
  test(`${crossPage ? 'cross-page' : 'same-page'} ${occupied ? 'swap' : 'move'} requires confirmation and preserves exact cards, quantities, ownership and placement metadata`, () => {
    const destinationPage = crossPage ? 40 : 1
    const initial = fixture(occupied, destinationPage), ui = app(initial)
    ui.open()
    const sourceCard = ui.dialog().card
    const targetCard = ui.dialog().pages[destinationPage - 1].slots[1].card
    const selectorUI = selector(ui.dialog())
    if (crossPage) selectorUI.page(destinationPage)
    const targetId = `page-${destinationPage}-slot-2`, targetBefore = ui.slot(targetId)
    const beforeReview = ui.data.get(storageKeys.binder)
    selectorUI.select(2)
    assert.ok(selectorUI.text().includes(occupied ? 'Review Swap' : 'Review Move'))
    selectorUI.review()
    assert.equal(selectorUI.confirmation().props.role, 'alertdialog')
    assert.equal(selectorUI.confirmation().props['aria-label'], occupied ? 'Swap these cards?' : 'Move this card?')
    assert.equal(ui.data.get(storageKeys.binder), beforeReview)
    assert.ok(selectorUI.text().includes(occupied ? 'Collection quantities stay the same.' : 'The source pocket will become empty.'))
    selectorUI.confirm(); ui.render()
    assert.equal(ui.dialog(), undefined)
    assert.deepEqual(ui.slot(targetId).card, firstCard)
    assert.deepEqual(ui.slot('page-1-slot-1').card, occupied ? secondCard : null)
    assert.equal(ui.slot('page-1-slot-1').note, 'source slot metadata')
    assert.equal(ui.slot(targetId).note, targetBefore.note)
    assert.ok(ui.pages().every((page: any) => page.note === 'keep page metadata'))
    assert.equal(ui.data.get(storageKeys.collection), initial[storageKeys.collection])
    const actualTarget = ui.spread().rightPage.slots[0].card
    if (!crossPage && occupied) assert.equal(actualTarget.variant.variantId, UNSPECIFIED_VARIANT.variantId)
    assert.equal(sourceCard.variant.stamp[0], 'staff')
    ui.spread().onSlotClick(targetId); ui.render()
    assert.equal(ui.find('BinderCardActions').props.isOwned, true)
    assert.equal(ui.find('BinderCardActions').props.card, sourceCard)
    if (occupied) { ui.spread().onSlotClick('page-1-slot-1'); ui.render(); assert.equal(ui.find('BinderCardActions').props.isOwned, false); assert.equal(ui.find('BinderCardActions').props.card, targetCard) }
    const reload = app(Object.fromEntries(ui.data))
    assert.deepEqual(reload.slot(targetId), ui.slot(targetId))
    assert.deepEqual(reload.slot('page-1-slot-1'), ui.slot('page-1-slot-1'))
    assert.equal(reload.data.get(storageKeys.collection), initial[storageKeys.collection])
  })
}

test('source pocket is disabled and cannot be selected or submitted, even through a direct callback', () => {
  const ui = app(fixture()); ui.open()
  const picker = selector(ui.dialog())
  assert.equal(picker.pocket(1).props.disabled, true)
  assert.match(picker.pocket(1).props['aria-label'], /original pocket/)
  const before = ui.data.get(storageKeys.binder)
  picker.select(1); assert.equal(picker.button('Review Swap'), undefined)
  assert.match(ui.dialog().onSelectPocket(1, 'page-1-slot-1', ui.dialog().card), /different destination/)
  ui.render(); assert.equal(ui.data.get(storageKeys.binder), before)
})

test('cancelling confirmation or closing the selector leaves all binder and collection data unchanged', () => {
  const ui = app(fixture()), before = Object.fromEntries(ui.data); ui.open()
  const picker = selector(ui.dialog()); picker.select(2); picker.review()
  picker.button('Cancel').props.onClick(); picker.render()
  assert.deepEqual(Object.fromEntries(ui.data), before)
  picker.review(); picker.escape()
  assert.equal(picker.confirmation(), undefined); assert.ok(picker.button('Review Swap'))
  assert.deepEqual(Object.fromEntries(ui.data), before)
  picker.escape(); ui.render(); assert.equal(ui.dialog(), undefined)
  assert.deepEqual(Object.fromEntries(ui.data), before)
})

test('invalid page, missing pocket, wrong page/pocket pairing and unreviewed targets are rejected', () => {
  const ui = app(fixture()); ui.open()
  const before = ui.data.get(storageKeys.binder), target = ui.slot('page-1-slot-2').card
  for (const [page, id, expected] of [[99, 'page-1-slot-2', target], [1, 'missing', null], [2, 'page-1-slot-2', target], [1, 'page-1-slot-2', undefined]] as const) {
    assert.equal(typeof ui.dialog().onSelectPocket(page, id, expected), 'string')
    ui.render(); assert.equal(ui.data.get(storageKeys.binder), before); assert.ok(ui.dialog())
  }
})

test('changed or empty sources are rejected without moving the replacement placement', () => {
  for (const remove of [false, true]) {
    const ui = app(fixture()); ui.open()
    if (remove) {
      ui.spread().onSlotClick('page-1-slot-1'); ui.render(); ui.find('BinderCardActions').props.onRemove()
    } else ui.spread().onTouchCardDrop('page-1-slot-2', 'page-1-slot-1')
    ui.render()
    const current = ui.data.get(storageKeys.binder)
    assert.match(ui.dialog().onSelectPocket(1, 'page-1-slot-3', null), /source card changed/)
    ui.render(); assert.equal(ui.data.get(storageKeys.binder), current)
  }
})

test('a destination changed after preview is rejected and reported in the active confirmation', () => {
  for (const occupied of [false, true]) {
    const initial = fixture(occupied)
    if (!occupied) {
      const pages = JSON.parse(initial[storageKeys.binder]); pages[0].slots[2].card = secondCard
      initial[storageKeys.binder] = JSON.stringify(pages)
    }
    const ui = app(initial); ui.open()
    const picker = selector(ui.dialog()); picker.select(2); picker.review()
    ui.spread().onTouchCardDrop(occupied ? 'page-1-slot-2' : 'page-1-slot-3', occupied ? 'page-1-slot-3' : 'page-1-slot-2')
    ui.render(); picker.update(ui.dialog())
    const current = ui.data.get(storageKeys.binder)
    picker.confirm(); ui.render()
    assert.match(content(picker.find(n => n.props?.role === 'alert')), /destination changed/)
    assert.equal(ui.data.get(storageKeys.binder), current)
    assert.ok(ui.dialog())
  }
})

test('the shared functional state updater rejects stale confirmations even when invoked through an old callback', () => {
  const ui = app(fixture()); ui.open()
  // Capture the actual reviewed card object and callback before the pending update.
  const picker = selector(ui.dialog()); picker.select(2); picker.review()
  const callback = picker.button('Confirm Swap').props.onClick
  ui.spread().onTouchCardDrop('page-1-slot-2', 'page-1-slot-3')
  ui.render()
  const current = ui.data.get(storageKeys.binder)
  callback(); ui.render()
  assert.equal(ui.data.get(storageKeys.binder), current)
})

test('selector starts on the source page and supports every supplied page, including pages beyond 40', () => {
  const ui = app(fixture(false, 43, 7, 43)); ui.open('page-7-slot-1')
  const picker = selector(ui.dialog())
  assert.match(picker.pocket(1).props['aria-label'], /^Page 7/)
  picker.page(43); picker.select(2); picker.review(); picker.confirm(); ui.render()
  assert.equal(ui.slot('page-43-slot-2').card.id, firstCard.id)
  assert.equal(ui.slot('page-7-slot-1').card, null)
})

test('Move / Swap cancels pending details before opening; selector and confirmation use named dialogs and native keyboard controls', () => {
  const ui = app(fixture())
  ui.spread().onSlotClick('page-1-slot-1'); ui.render()
  ui.find('BinderCardActions').props.onViewDetails(); ui.render()
  assert.equal(ui.requests[0].aborted, false)
  ui.find('BinderCardActions').props.onMove(); ui.render()
  assert.equal(ui.requests[0].aborted, true)
  const picker = selector(ui.dialog())
  const dialog = picker.find(n => n.props?.role === 'dialog')
  assert.equal(dialog.props['aria-label'], 'Move or swap Pikachu')
  assert.equal(dialog.props['aria-modal'], 'true')
  assert.equal(picker.pocket(2).type, 'button')
  assert.equal(picker.pocket(2).props.type, 'button')
  assert.equal(picker.pocket(2).props['aria-pressed'], false)
  assert.match(picker.pocket(2).props['aria-label'], /Page 1, pocket 2: Occupied by Charizard/)
  assert.ok(picker.find(n => n.type === 'img' && n.props.src === `${secondCard.image}/high.webp`))
  picker.select(2); assert.equal(picker.pocket(2).props['aria-pressed'], true)
  picker.review()
  assert.equal(picker.button('Cancel').type, 'button')
  assert.equal(picker.confirmation().props['aria-describedby'], 'binder-move-description')
})

test('ordinary collection placement keeps its existing empty-pocket and replacement callbacks', () => {
  const calls: any[] = []
  const pages = completeBinder([]); pages[0].slots[1].card = secondCard
  const picker = selector({ card: { ...firstCard, quantity: 3 }, pages,
    onSelectPocket: (...args: any[]) => calls.push(args), onClose() {} })
  picker.select(1); picker.button('Place Card Here').props.onClick()
  assert.deepEqual(calls, [[1, 'page-1-slot-1']])
  picker.select(2); picker.button('Replace Card').props.onClick(); picker.render()
  assert.equal(picker.confirmation().props['aria-label'], 'Replace this card?')
  picker.button('Confirm Replacement').props.onClick()
  assert.deepEqual(calls, [[1, 'page-1-slot-1'], [1, 'page-1-slot-2']])
})


test('occupied-pocket actions expose Move / Swap as a native, named keyboard button', () => {
  const exports: any = {}
  let moved = 0
  runInNewContext(transpileModule(readFileSync('src/components/BinderCardActions.tsx', 'utf8'), options).outputText, {
    exports, require(name: string) {
      if (name === '../hooks/useModalFocus') return { useModalFocus: () => ({ current: null }) }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      return {}
    },
  })
  const tree = exports.default({ card: firstCard, isOwned: true, onMove: () => moved++ })
  const move = nodes(tree).find(n => n.type === 'button' && content(n) === 'Move / Swap Card')
  assert.ok(move); assert.equal(move.props.type, 'button')
  assert.equal(move.props.disabled, undefined); assert.equal(move.props.tabIndex, undefined)
  move.props.onClick(); assert.equal(moved, 1)
})
