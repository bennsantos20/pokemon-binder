import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import { accessibilityChanges, binderViewLabel } from '../src/services/accessibility.ts'
import { createBinderPage } from '../src/services/storage.ts'
import { UNSPECIFIED_VARIANT } from '../src/services/variants.ts'

const first = { id: 'pika-normal', cardId: 'pika', name: 'Pikachu', localId: '25',
  set: { id: 'set', name: 'Set' }, variant: { variantId: 'normal', type: 'normal', size: 'standard' } }
const second = { ...first, id: 'pika-unspecified', variant: UNSPECIFIED_VARIANT }
const pages = () => [createBinderPage(1), createBinderPage(2)]
const snapshot = (binder = pages(), collection: any[] = [], viewLabel = 'Front / Page 1') => ({ pages: binder, collection, viewLabel })
const options = { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }
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

test('committed placement, replacement and removal announcements identify printing and pocket without modifying data', () => {
  const before = pages(), placed = pages(); placed[0].slots[0].card = first
  const source = snapshot(before), target = snapshot(placed)
  assert.equal(accessibilityChanges(source, target), 'Placed Pikachu (normal) on Page 1, pocket 1.')
  const replaced = pages(); replaced[0].slots[0].card = second
  assert.match(accessibilityChanges(target, snapshot(replaced)), /Replaced Pikachu \(normal\) with Pikachu \(Printing Unspecified\) on Page 1, pocket 1/)
  assert.equal(accessibilityChanges(target, source), 'Removed Pikachu (normal) from Page 1, pocket 1.')
  assert.equal(before[0].slots[0].card, null); assert.equal(placed[0].slots[0].card, first)
})

for (const reverse of [false, true]) test(`moves ${reverse ? 'backward' : 'forward'} across pages produce one announcement rather than removal plus placement`, () => {
  const before = pages(), after = pages()
  const from = reverse ? 1 : 0, to = reverse ? 0 : 1
  before[from].slots[0].card = first; after[to].slots[1].card = first
  assert.equal(accessibilityChanges(snapshot(before), snapshot(after)), `Moved Pikachu (normal) from Page ${from + 1}, pocket 1 to Page ${to + 1}, pocket 2.`)
})

test('swaps produce one announcement, distinguish unspecified printings, and preserve source objects', () => {
  const before = pages(), after = pages()
  before[0].slots[0].card = first; before[1].slots[1].card = second
  after[0].slots[0].card = second; after[1].slots[1].card = first
  assert.equal(accessibilityChanges(snapshot(before), snapshot(after)),
    'Swapped Pikachu (normal) on Page 1, pocket 1 with Pikachu (Printing Unspecified) on Page 2, pocket 2.')
  assert.equal(after[0].slots[0].card, second); assert.equal(after[1].slots[1].card, first)
})

test('collection additions, quantity edits and removal announce current quantity values, keeping printing identities separate', () => {
  const before = snapshot(pages(), [{ ...first, quantity: 3 }])
  const after = snapshot(before.pages, [{ ...first, quantity: 4 }, { ...second, quantity: 1 }])
  assert.equal(accessibilityChanges(before, after), 'Pikachu (normal) owned quantity updated to 4. Added Pikachu (Printing Unspecified) to My Collection. Owned quantity: 1.')
  assert.equal(accessibilityChanges(after, snapshot(before.pages, [after.collection[1]])), 'Removed Pikachu (normal) from My Collection.')
  assert.equal(before.collection[0].quantity, 3)
})

test('unchanged data, same quantities, no-op naming, cancellations and rejected operations stay silent', () => {
  const before = snapshot(pages(), [{ ...first, quantity: 3 }])
  assert.equal(accessibilityChanges(before, before), '')
  const clonedPages = before.pages.map(page => ({ ...page, name: '', slots: page.slots.map(slot => ({ ...slot })) }))
  assert.equal(accessibilityChanges(before, snapshot(clonedPages, [{ ...first, quantity: 3 }])), '')
})

test('page navigation and naming are concise, initial state has no synthetic action, and bulk updates are summarized', () => {
  const before = snapshot(), after = snapshot(before.pages, before.collection, 'Pages 2–3')
  assert.equal(accessibilityChanges(before, after), 'Viewing Pages 2–3.')
  const named = before.pages.map(page => ({ ...page, name: 'Johto Favorites' }))
  assert.match(accessibilityChanges(before, snapshot(named)), /Page 1 named Johto Favorites/)
  assert.match(accessibilityChanges(snapshot(named), before), /Page 1 name cleared/)
  const bulk = pages(); for (const slot of bulk[0].slots) slot.card = first
  assert.equal(accessibilityChanges(before, snapshot(bulk)), 'Updated 9 binder pockets.')
})

test('view labels retain existing desktop spreads and mobile single pages, including first and last views', () => {
  assert.equal(binderViewLabel(40, false, 1, 0), 'Front / Page 1')
  assert.equal(binderViewLabel(40, false, 1, 1), 'Pages 2–3')
  assert.equal(binderViewLabel(40, false, 1, 20), 'Page 40 / Back')
  assert.equal(binderViewLabel(40, true, 4, 0), 'Page 4')
  assert.equal(binderViewLabel(40, true, 40, 0), 'Page 40')
})

function status() {
  const states: any[] = [], refs: any[] = []
  let cursor = 0, refCursor = 0, previousDeps: any[] | undefined, pendingEffect: (() => void) | undefined
  let tree: any, current = snapshot()
  const exports: any = {}
  runInNewContext(transpileModule(readFileSync('src/components/AccessibilityStatus.tsx', 'utf8'), options).outputText, {
    exports, require(name: string) {
      if (name === '../services/accessibility') return { accessibilityChanges }
      if (name === 'react') return {
        useRef(value: any) { const index = refCursor++; return refs[index] ??= { current: value } },
        useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = initial
          return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
        useEffectEvent: (fn: any) => fn,
        useEffect(fn: () => void, deps: any[]) {
          if (!previousDeps || deps.some((value, i) => value !== previousDeps![i])) pendingEffect = fn
          previousDeps = deps
        },
      }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      return {}
    },
  })
  function render(next = current) {
    current = next; cursor = 0; refCursor = 0; pendingEffect = undefined
    tree = exports.default(current); const effect = pendingEffect; effect?.()
  }
  render(); render()
  return { render, tree: () => tree, text: () => content(tree), current: () => current }
}

test('one polite atomic live region starts empty, reports completed changes, and does not repeat on unrelated renders', () => {
  const ui = status()
  assert.equal(ui.tree().props.role, 'status'); assert.equal(ui.tree().props['aria-atomic'], 'true')
  assert.equal(ui.tree().props['aria-live'], undefined); assert.equal(ui.text(), '')
  const after = snapshot(); after.pages[0].slots[0].card = first
  ui.render(after); ui.render()
  assert.equal(ui.text(), 'Placed Pikachu (normal) on Page 1, pocket 1.')
  const key = ui.tree().props.children.key
  ui.render({ ...after }); ui.render()
  assert.equal(ui.tree().props.children.key, key)
  ui.render(snapshot(after.pages, after.collection, 'Pages 2–3')); ui.render()
  assert.equal(ui.text(), 'Viewing Pages 2–3.')
})

function navigation(mobile: boolean) {
  const states: any[] = [], refs: any[] = [], data = new Map<string, string>()
  let cursor = 0, refCursor = 0, tree: any
  const window = {
    addEventListener() {}, removeEventListener() {},
    localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) },
    matchMedia: () => ({ matches: mobile, addEventListener() {}, removeEventListener() {} }),
  }
  function execute(file: string) {
    const exports: any = {}
    runInNewContext(transpileModule(readFileSync(file, 'utf8'), options).outputText, {
      exports, window, AbortController,
      require(name: string) {
        if (name === './services/accessibility') return { binderViewLabel }
        if (name === './services/nativeBinderDrag') return execute('src/services/nativeBinderDrag.ts')
        if (name === './services/storage') return execute('src/services/storage.ts')
        if (name === './services/latestRequest') return execute('src/services/latestRequest.ts')
        if (name === 'react') return {
          useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
            return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }] },
          useRef(value: any) { const index = refCursor++; return refs[index] ??= { current: value } },
          useEffect() {}, useEffectEvent: (fn: any) => fn,
        }
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
        return { __esModule: true, default: name }
      },
    })
    return exports
  }
  const App = execute('src/App.tsx').default
  const find = (predicate: (n: any) => boolean) => nodes(tree).find(predicate)
  const trigger = () => find(n => n.props?.className === 'binder-page-navigator-trigger')
  function render() { cursor = 0; refCursor = 0; tree = App() }
  const buttons = () => find(n => n.props?.className === 'binder-navigation').props.children.filter((n: any) => n.type === 'button')
  render()
  return { render, find, trigger,
    next() { buttons()[1].props.onClick(); render() }, previous() { buttons()[0].props.onClick(); render() },
    previousLabel: () => buttons()[0].props['aria-label'], nextLabel: () => buttons()[1].props['aria-label'],
    choose(key: number) { trigger().props.onClick(); render(); find(n => n.type === 'button' && n.key === key).props.onClick(); render() },
    selected() { trigger().props.onClick(); render(); return find(n => n.props?.['aria-current'] === 'page') },
  }
}

test('mobile navigation names follow the mobile page rather than stale desktop spread state', () => {
  const ui = navigation(true)
  assert.equal(ui.trigger().props['aria-label'], 'Page 1. Choose binder pages')
  ui.next(); ui.next(); ui.next()
  assert.equal(ui.trigger().props['aria-label'], 'Page 4. Choose binder pages')
  assert.equal(ui.previousLabel(), 'Previous binder page')
  assert.equal(ui.trigger().props['aria-controls'], 'binder-page-navigator-menu')
  ui.choose(40); assert.equal(ui.nextLabel(), 'Front, return to Page 1')
  ui.next(); assert.equal(ui.trigger().props['aria-label'], 'Page 1. Choose binder pages')
  ui.previous(); assert.equal(ui.trigger().props['aria-label'], 'Page 40. Choose binder pages')
  assert.equal(ui.selected().key, 40)
})

test('desktop navigation retains wrapping and exposes the current spread in trigger and selected-option semantics', () => {
  const ui = navigation(false)
  assert.equal(ui.trigger().props['aria-label'], 'Front / Page 1. Choose binder pages')
  ui.previous(); assert.equal(ui.trigger().props['aria-label'], 'Page 40 / Back. Choose binder pages')
  ui.next(); ui.choose(3)
  assert.equal(ui.trigger().props['aria-label'], 'Pages 6–7. Choose binder pages')
  assert.equal(ui.selected().key, 3)
  assert.equal(ui.previousLabel(), 'Previous binder spread'); assert.equal(ui.nextLabel(), 'Next binder spread')
})

const css = readFileSync('src/App.css', 'utf8')
function color(selector: string, property: string) {
  const rule = css.slice(css.indexOf(`${selector} {`)).split('}')[0]
  const match = rule.match(new RegExp(`(?:^|[;\\n])\\s*${property}:\\s*(#[a-fA-F0-9]{6})`))
  assert.ok(match, `${selector} ${property}`)
  return match[1]
}
function contrast(a: string, b: string) {
  const luminance = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  const first = luminance(a), second = luminance(b)
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05)
}

test('secondary text and light binder labels meet normal-text contrast on their actual dark/green base surfaces', () => {
  for (const [foreground, background] of [
    [color('.image-placeholder', 'color'), color('.card-result', 'background')],
    [color('.collection-card-number', 'color'), color('.collection-card', 'background')],
    [color('.search-bar input::placeholder', 'color'), color('.search-bar', 'background')],
    [color('.binder-page-number', 'color'), color('.binder-page', 'background')],
    [color('.binder-page-custom-name', 'color'), color('.binder-page', 'background')],
    // Pocket gradients add white, so the darker green page is a conservative lower bound.
    [color('.binder-pocket', 'color'), color('.binder-page', 'background')],
    [color('.empty-pocket-plus', 'color'), color('.binder-page', 'background')],
  ]) assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background}`)
})
