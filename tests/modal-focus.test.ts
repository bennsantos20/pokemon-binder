import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind } from 'typescript'

// Small DOM double for the focus manager. Browser layout/AT behavior is checked separately.
function environment() {
  const listeners = new Map<string, Set<(event: any) => void>>()
  const microtasks: Array<() => void> = []
  const document: any = {
    addEventListener(type: string, fn: any) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(fn) },
    removeEventListener(type: string, fn: any) { listeners.get(type)?.delete(fn) },
    querySelector(selector: string) { return document.body.querySelector(selector) },
  }
  class Element {
    children: Element[] = []
    parentElement: Element | null = null
    inert = false
    hidden = false
    disabled = false
    visible = true
    tabIndex: number
    tag: string
    id: string
    role: string
    constructor(tag = 'div', id = '', role = '') { this.tag = tag; this.id = id; this.role = role; this.tabIndex = ['button', 'input'].includes(tag) ? 0 : -1 }
    get isConnected(): boolean { return this === document.body || !!this.parentElement?.isConnected }
    append(...elements: Element[]) { for (const element of elements) { element.parentElement = this; this.children.push(element) } }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this); this.parentElement = null }
    contains(element: Element | null): boolean { return element === this || this.children.some(child => child.contains(element)) }
    matches(selector: string) {
      if (selector === ':disabled') return this.disabled
      if (selector === '[role="dialog"], [role="alertdialog"]') return ['dialog', 'alertdialog'].includes(this.role)
      if (selector === 'dialog[open]') return this.tag === 'dialog'
      if (selector === '[data-dialog-fallback]') return this.id === 'fallback'
      return selector === `#${this.id}`
    }
    closest(_selector: string): Element | null { return this.inert || this.hidden ? this : this.parentElement?.closest(_selector) ?? null }
    querySelectorAll(selector: string): Element[] {
      const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')])
      if (selector === '*') return all
      if (selector.startsWith('button,')) return all.filter(element => ['button', 'input'].includes(element.tag) || element.tabIndex >= 0)
      return all.filter(element => element.matches(selector))
    }
    querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null }
    getClientRects() { return this.visible && this.isConnected ? [1] : [] }
    focus() { document.activeElement = this; dispatch('focusin', { target: this }) }
  }
  const body = new Element('body'), background = new Element('main', 'fallback'), opener = new Element('button', 'opener')
  document.body = body; document.activeElement = body; background.append(opener); body.append(background)
  function dispatch(type: string, values: any = {}) {
    const event = { key: '', shiftKey: false, prevented: false, stopped: false,
      preventDefault() { this.prevented = true }, stopImmediatePropagation() { this.stopped = true }, ...values }
    for (const listener of listeners.get(type) ?? []) { listener(event); if (event.stopped) break }
    return event
  }
  const exports: any = {}
  runInNewContext(transpileModule(readFileSync('src/services/modalFocus.ts', 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS },
  }).outputText, {
    exports, document, HTMLElement: Element,
    getComputedStyle: () => ({ visibility: 'visible' }), queueMicrotask: (fn: () => void) => microtasks.push(fn),
  })
  function modal(id = 'modal', parent = body) {
    const overlay = new Element(), panel = new Element('div', id, 'dialog')
    const first = new Element('button', `${id}-first`), last = new Element('button', `${id}-last`)
    panel.append(first, last); overlay.append(panel); parent.append(overlay)
    return { overlay, panel, first, last }
  }
  return { Element, document, body, background, opener, modal, dispatch, listeners,
    activate: exports.activateModal, capture: exports.captureModalReturnFocus,
    flush() { while (microtasks.length) microtasks.shift()!() },
  }
}

test('modal focuses initial control, traps Tab both ways, rejects background focus, and restores inert state and opener', () => {
  const env = environment(), modal = env.modal()
  const alreadyInert = new env.Element(); alreadyInert.inert = true; env.body.append(alreadyInert)
  env.opener.focus()
  const cleanup = env.activate(modal.panel, { onClose() {}, initialFocus: '#modal-last' })
  assert.equal(env.document.activeElement, modal.last)
  assert.equal(env.background.inert, true)
  assert.equal(env.dispatch('keydown', { key: 'Tab' }).prevented, true)
  assert.equal(env.document.activeElement, modal.first)
  env.dispatch('keydown', { key: 'Tab', shiftKey: true })
  assert.equal(env.document.activeElement, modal.last)
  env.opener.focus(); assert.equal(env.document.activeElement, modal.last)
  cleanup(); env.flush()
  assert.equal(env.document.activeElement, env.opener)
  assert.equal(env.background.inert, false); assert.equal(alreadyInert.inert, true)
  assert.ok([...env.listeners.values()].every(set => set.size === 0))
})

test('empty and disabled-only dialogs focus the container and keep Tab inside', () => {
  const env = environment(), modal = env.modal()
  modal.first.disabled = true; modal.last.hidden = true
  const cleanup = env.activate(modal.panel, { onClose() {} })
  assert.equal(env.document.activeElement, modal.panel)
  assert.equal(env.dispatch('keydown', { key: 'Tab' }).prevented, true)
  assert.equal(env.document.activeElement, modal.panel)
  cleanup(); env.flush(); assert.equal(env.document.activeElement, env.background)
})

test('nested confirmation Escape closes only the top layer and restores focus after its trigger is re-enabled', () => {
  const env = environment(), outer = env.modal('outer')
  let outerClosed = 0, innerClosed = 0
  env.opener.focus()
  const closeOuter = env.activate(outer.panel, { onClose() { outerClosed++ } })
  outer.last.focus()
  const inner = env.modal('inner', outer.panel)
  const closeInner = env.activate(inner.panel, { onClose() { innerClosed++ } })
  outer.last.disabled = true
  assert.equal(outer.first.inert, true); assert.equal(inner.panel.closest('[inert]'), null)
  const event = env.dispatch('keydown', { key: 'Escape' })
  assert.equal(event.stopped, true); assert.equal(event.prevented, true)
  assert.equal(innerClosed, 1); assert.equal(outerClosed, 0)
  closeInner(); inner.overlay.remove(); outer.last.disabled = false; env.flush()
  assert.equal(env.document.activeElement, outer.last)
  assert.equal(outer.first.inert, false); assert.equal(env.background.inert, true)
  env.dispatch('keydown', { key: 'Escape' }); assert.equal(outerClosed, 1)
  closeOuter(); env.flush(); assert.equal(env.document.activeElement, env.opener)
})

test('replacing a dialog preserves its original opener and supersedes pending focus restoration', () => {
  const env = environment(), outer = env.modal('outer')
  env.opener.focus()
  const closeOuter = env.activate(outer.panel, { onClose() {} })
  outer.last.focus()
  const returnFocus = env.capture()
  closeOuter(); outer.overlay.remove()
  const details = env.modal('details')
  const closeDetails = env.activate(details.panel, { onClose() {}, returnFocus })
  env.flush(); assert.equal(env.document.activeElement, details.first)
  closeDetails(); details.overlay.remove(); env.flush()
  assert.equal(env.document.activeElement, env.opener)
})

test('removing an underlying dialog first carries the opener into its successor', () => {
  const env = environment(), outer = env.modal('outer')
  env.opener.focus()
  const closeOuter = env.activate(outer.panel, { onClose() {} })
  outer.last.focus()
  const details = env.modal('details')
  const closeDetails = env.activate(details.panel, { onClose() {} })
  closeOuter(); outer.overlay.remove(); env.flush()
  assert.equal(env.document.activeElement, details.first)
  env.opener.remove(); closeDetails(); env.flush()
  assert.equal(env.document.activeElement, env.background)
})

test('active backdrop retains dismissal, but clicks behind a nested confirmation are blocked', () => {
  const env = environment(), outer = env.modal('outer')
  const closeOuter = env.activate(outer.panel, { onClose() {} })
  assert.equal(env.dispatch('click', { target: outer.overlay }).stopped, false)
  assert.equal(env.dispatch('click', { target: env.opener }).stopped, true)
  const inner = env.modal('inner', outer.panel)
  const closeInner = env.activate(inner.panel, { onClose() {} })
  assert.equal(env.dispatch('click', { target: outer.overlay }).stopped, true)
  assert.equal(env.dispatch('click', { target: inner.first }).stopped, false)
  closeInner(); closeOuter(); env.flush()
})

test('native backup dialog keeps ownership of Escape and focus without being dismissed by the custom manager', () => {
  const env = environment(), outer = env.modal()
  let closed = 0
  const cleanup = env.activate(outer.panel, { onClose() { closed++ } })
  const backup = new env.Element('dialog'); env.body.append(backup)
  const event = env.dispatch('keydown', { key: 'Escape' })
  assert.equal(closed, 0); assert.equal(event.prevented, false)
  backup.focus(); assert.equal(env.document.activeElement, backup)
  cleanup(); env.flush(); assert.equal(env.document.activeElement, backup)
})

test('register/cleanup/register cycle restores background correctly and leaves no stale listeners', () => {
  const env = environment(), modal = env.modal()
  env.opener.focus()
  const cleanup = env.activate(modal.panel, { onClose() {} })
  cleanup()
  const second = env.activate(modal.panel, { onClose() {}, returnFocus: [env.opener] })
  env.flush(); assert.equal(env.document.activeElement, modal.first)
  second(); env.flush()
  assert.equal(env.background.inert, false); assert.equal(env.document.activeElement, env.opener)
  assert.ok([...env.listeners.values()].every(set => set.size === 0))
})
