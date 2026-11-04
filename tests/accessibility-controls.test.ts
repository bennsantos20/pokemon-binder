import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'
import { createBinderPage } from '../src/services/storage.ts'

// Inspect rendered JSX and exercise existing callbacks without adding a DOM dependency.
function component(file: string, props: any) {
  const states: any[] = []
  let cursor = 0
  const exports: any = {}
  runInNewContext(transpileModule(readFileSync(`src/components/${file}.tsx`, 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    MouseEvent: class {},
    require(name: string) {
      if (name === 'react') return {
        useState(initial: any) {
          const index = cursor++
          if (!(index in states)) states[index] = initial
          return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next }]
        },
        useRef: () => ({ current: null }), useEffect() {},
      }
      if (name === 'react/jsx-runtime') return {
        jsx: (type: any, props: any, key: any) => ({ type, props, key }),
        jsxs: (type: any, props: any, key: any) => ({ type, props, key }),
      }
      return new Proxy({}, { get: (_, name) => name })
    },
  })
  let tree: any
  function render() { cursor = 0; tree = exports.default(props) }
  function nodes(value: any): any[] {
    if (!value || typeof value !== 'object') return []
    if (Array.isArray(value)) return value.flatMap(nodes)
    return [value, ...nodes(value.props?.children)]
  }
  render()
  return { render, all: () => nodes(tree), find: (predicate: (n: any) => boolean) => nodes(tree).find(predicate) }
}
const card = {
  id: 'pikachu-normal', cardId: 'pikachu', name: 'Pikachu', localId: '1',
  image: 'https://example.test/pikachu', set: { id: 'set', name: 'Set' },
  variant: { variantId: 'normal', type: 'normal', size: 'standard' }, quantity: 2,
}

test('quantity controls have card-specific names and retain quantity limits and saving', () => {
  const saved: number[] = []
  const ui = component('CollectionCardActions', { card, onManageQuantity: (n: number) => saved.push(n) })
  ui.find(n => n.type === 'button' && n.props.children?.[1]?.props?.children === 'Manage Quantity').props.onClick()
  ui.render()
  const decrease = () => ui.find(n => n.props?.['aria-label'] === 'Decrease quantity of Pikachu')
  const increase = () => ui.find(n => n.props?.['aria-label'] === 'Increase quantity of Pikachu')
  assert.equal(decrease().type, 'button'); assert.equal(increase().type, 'button')
  assert.equal(decrease().props.children.props['aria-hidden'], 'true')
  decrease().props.onClick(); ui.render(); assert.equal(decrease().props.disabled, true)
  increase().props.onClick(); ui.render()
  ui.find(n => n.type === 'button' && n.props.children?.[1]?.props?.children === 'Save Quantity').props.onClick()
  assert.deepEqual(saved, [2])
})

test('placement page controls have names and retain first/last page boundaries', () => {
  const ui = component('CollectionBinderPlacement', { card, pages: [createBinderPage(1), createBinderPage(2)] })
  const previous = () => ui.find(n => n.props?.['aria-label'] === 'Previous binder page')
  const next = () => ui.find(n => n.props?.['aria-label'] === 'Next binder page')
  assert.equal(previous().props.disabled, true); assert.equal(next().props.disabled, false)
  assert.equal(next().props.children.props['aria-hidden'], 'true')
  next().props.onClick(); ui.render()
  assert.equal(previous().props.disabled, false); assert.equal(next().props.disabled, true)
  previous().props.onClick(); ui.render(); assert.equal(previous().props.disabled, true)
})

function binder(preview = false) {
  const page = createBinderPage(4)
  page.slots[0].card = card
  page.slots[1].card = { ...card, variant: { ...card.variant, variantId: 'holo' } }
  const calls: any[] = []
  const ui = component('BinderPage', {
    page, isPreviewMode: preview, isRearrangeMode: true, highlightedSlotId: page.slots[0].id,
    ownedCardIds: new Set(['pikachu-normal']), onRenamePage() {},
    onSlotClick: (...args: any[]) => calls.push(['click', ...args]),
    onDragStart: (...args: any[]) => calls.push(['drag', ...args]),
    onDrop: (...args: any[]) => calls.push(['drop', ...args]),
    onTouchCardStart: (...args: any[]) => calls.push(['touch', ...args]),
  })
  return { ...ui, calls, pockets: () => ui.all().filter(n => n.props?.className?.split(' ').includes('binder-pocket')) }
}

test('editing pockets name page, position, occupancy and exact-printing ownership without duplicate image text', () => {
  const ui = binder(); const pockets = ui.pockets()
  assert.equal(pockets[0].props['aria-label'], 'Page 4, pocket 1: Occupied by Pikachu, owned')
  assert.equal(pockets[1].props['aria-label'], 'Page 4, pocket 2: Occupied by Pikachu, not owned')
  assert.equal(pockets[2].props['aria-label'], 'Page 4, pocket 3: Empty')
  assert.ok(pockets.every(n => n.type === 'button' && n.props.type === 'button'))
  assert.equal(pockets[0].props.children.props.alt, '')
  assert.equal(pockets[0].props.draggable, true)
  assert.equal(pockets[2].props.draggable, false)
  pockets[0].props.onClick(); pockets[0].props.onDragStart(); pockets[1].props.onDrop()
  let prevented = false
  pockets[1].props.onDragOver({ preventDefault() { prevented = true } })
  const event = { pointerType: 'touch' }
  pockets[0].props.onPointerDown(event)
  assert.equal(prevented, true)
  assert.deepEqual(ui.calls, [
    ['click', 'page-4-slot-1'], ['drag', 'page-4-slot-1'], ['drop', 'page-4-slot-2'],
    ['touch', event, 'page-4-slot-1', card.image],
  ])
})

test('Preview pockets retain content and styling but have no interactive semantics or handlers', () => {
  const ui = binder(true)
  assert.equal(ui.pockets().length, 9)
  for (const pocket of ui.pockets()) {
    assert.equal(pocket.type, 'div'); assert.equal(pocket.props.role, 'img')
    assert.equal(pocket.props.className, 'binder-pocket')
    assert.equal(pocket.props.tabIndex, undefined)
    assert.equal(pocket.props.draggable, undefined)
    assert.ok(!Object.keys(pocket.props).some(key => key.startsWith('on')))
    assert.match(pocket.props['aria-label'], /^Page 4, pocket /)
  }
  assert.equal(ui.all().filter(n => n.type === 'button').length, 0)
  assert.equal(ui.pockets()[0].props.children.props.src, `${card.image}/high.webp`)
  assert.equal(ui.pockets()[2].props.children.props.className, 'empty-pocket')
  assert.equal(ui.pockets()[2].props.children.props.children, false)
  assert.deepEqual(ui.calls, [])
})
