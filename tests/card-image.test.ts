import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, JsxEmit } from 'typescript'

function renderer() {
  let failed = false
  let previousKey: string | undefined
  const exports: any = {}
  runInNewContext(transpileModule(readFileSync('src/components/CardImage.tsx', 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX },
  }).outputText, { exports, require(name: string) {
    if (name === 'react') return { useState: () => [failed, (next: boolean) => { failed = next }] }
    const jsx = (type: any, props: any, key: string) => ({ type, props, key }); return { jsx, jsxs: jsx }
  } })
  return (props: any) => {
    const instance = exports.default(props)
    if (instance.key !== previousKey) failed = false
    previousKey = instance.key
    return instance.type(instance.props)
  }
}
const card = { cardId: 'base1-58', name: 'Pikachu', image: 'https://assets.example/pikachu' }

test('missing and blank images use a named noninteractive fallback without a network request', () => {
  for (const image of [undefined, '']) {
    const view = renderer()({ ...card, image })
    assert.equal(view.type, 'div'); assert.equal(view.props.role, 'img')
    assert.equal(view.props['aria-label'], 'Pikachu, image unavailable')
    assert.equal(view.props.onClick, undefined)
  }
})

test('failed requests replace only artwork, never retry in a loop, and preserve dimensions and metadata', () => {
  const render = renderer()
  const props = { ...card, className: 'binder-floating-card', style: { left: 10, top: 20 }, draggable: false }
  const image = render(props)
  assert.equal(image.type, 'img'); assert.equal(image.props.src, `${card.image}/high.webp`)
  image.props.onError()
  const fallback = render(props)
  assert.equal(fallback.type, 'div'); assert.equal(fallback.props.onError, undefined)
  assert.equal(fallback.props.style, props.style); assert.equal(fallback.props.draggable, false)
  assert.match(fallback.props.className, /binder-floating-card/)
  assert.equal(render(props).type, 'div'); assert.equal(props.image, card.image)
})

test('fallback recovers for a new image URL or card identity and hides redundant pocket announcements', () => {
  const render = renderer()
  render(card).props.onError(); assert.equal(render(card).type, 'div')
  const changed = { ...card, image: 'https://assets.example/new' }
  assert.equal(render(changed).type, 'img')
  render(changed).props.onError()
  assert.equal(render({ ...changed, cardId: 'different' }).type, 'img')
  const missing = render({ ...card, image: undefined, decorative: true })
  assert.equal(missing.props['aria-hidden'], true); assert.equal(missing.props.role, undefined)
  assert.equal(missing.props['aria-label'], undefined)
})
