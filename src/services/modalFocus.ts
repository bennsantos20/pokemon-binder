interface ModalOptions {
  onClose: () => void
  initialFocus?: string
  returnFocus?: HTMLElement[]
}
interface ModalLayer extends ModalOptions {
  element: HTMLElement
  opener: HTMLElement | null
  lastFocus: HTMLElement | null
}
const layers: ModalLayer[] = []
let revision = 0
const isolated = new Map<HTMLElement, boolean>()
const controls = 'button, input, select, textarea, a[href], [tabindex], [contenteditable="true"]'

function available(element: HTMLElement) {
  return !element.closest('[inert], [hidden]') &&
    !element.matches(':disabled') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
}
function tabbable(layer: ModalLayer) {
  return Array.from(layer.element.querySelectorAll<HTMLElement>(controls))
    .filter(element => element.tabIndex >= 0 && available(element))
}
function focusInside(layer: ModalLayer) {
  const preferred = layer.initialFocus
    ? layer.element.querySelector<HTMLElement>(layer.initialFocus) : null
  const target = layer.lastFocus?.isConnected && available(layer.lastFocus)
    ? layer.lastFocus : preferred && available(preferred) ? preferred : tabbable(layer)[0]
  ;(target ?? layer.element).focus({ preventScroll: true })
}
function isolateBackground() {
  for (const [element, wasInert] of isolated) element.inert = wasInert
  isolated.clear()
  const active = layers.at(-1)
  if (!active) return
  // Isolate siblings along the entire ancestor path, including underlying dialogs.
  // Never make an ancestor of the active dialog inert (nested confirmations live there).
  let branch: HTMLElement = active.element
  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling !== branch && sibling instanceof HTMLElement) {
        isolated.set(sibling, sibling.inert)
        sibling.inert = true
      }
    }
    branch = branch.parentElement
    if (branch === document.body) break
  }
}
function activeLayer() {
  const active = layers.at(-1)
  // A native modal (the backup confirmation) keeps its own focus and cancel rules.
  const native = document.querySelector('dialog[open]')
  return native && !active?.element.contains(native) ? undefined : active
}
function keydown(event: KeyboardEvent) {
  const active = activeLayer()
  if (!active) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    active.onClose()
  } else if (event.key === 'Tab') {
    const items = tabbable(active)
    const first = items[0], last = items.at(-1)
    if (!first) {
      event.preventDefault(); active.element.focus()
    } else if (!active.element.contains(document.activeElement) ||
      (event.shiftKey && (document.activeElement === first || document.activeElement === active.element))) {
      event.preventDefault(); (event.shiftKey ? last! : first).focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus()
    }
  }
}
function focusin(event: FocusEvent) {
  const active = activeLayer()
  if (!active) return
  if (event.target instanceof HTMLElement && active.element.contains(event.target)) active.lastFocus = event.target
  else focusInside(active)
}
function outsideClick(event: MouseEvent) {
  const active = activeLayer()
  if (!active || active.element.contains(event.target as Node)) return
  // Preserve the existing backdrop callback for the active outer modal only.
  const parent = active.element.parentElement
  if (event.target === parent && !parent?.matches('[role="dialog"], [role="alertdialog"]')) return
  event.preventDefault(); event.stopImmediatePropagation()
}

// Snapshot before React removes a menu that is being replaced by another dialog.
export function captureModalReturnFocus() {
  return [document.activeElement, ...layers.slice().reverse().map(layer => layer.opener)]
    .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== document.body)
}

/** Register one mounted modal. All dismissal goes through its existing callback. */
export function activateModal(element: HTMLElement, options: ModalOptions) {
  const layer: ModalLayer = {
    ...options, element, opener: (options.returnFocus ?? captureModalReturnFocus()).find(target => target.isConnected) ?? null,
    lastFocus: null,
  }
  revision++
  layers.push(layer)
  if (layers.length === 1) {
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('focusin', focusin, true)
    document.addEventListener('click', outsideClick, true)
  }
  isolateBackground()
  focusInside(layer)
  return () => {
    const index = layers.indexOf(layer)
    if (index < 0) return
    const wasTop = layers.at(-1) === layer
    const cleanupRevision = ++revision
    layers.splice(index, 1)
    // A modal may be replaced by another after an asynchronous detail request.
    // Carry its original opener forward rather than retaining a detached menu button.
    for (const other of layers) {
      if (other.opener && element.contains(other.opener)) other.opener = layer.opener
    }
    isolateBackground()
    if (!layers.length) {
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('focusin', focusin, true)
      document.removeEventListener('click', outsideClick, true)
    }
    if (!wasTop) return
    // Wait for React's current DOM commit (e.g. re-enabling Replace Card), without
    // a timer. A new modal registration supersedes this focus restoration.
    queueMicrotask(() => {
      if (revision !== cleanupRevision || document.querySelector('dialog[open]')) return
      const active = layers.at(-1)
      if (layer.opener?.isConnected && available(layer.opener) && (!active || active.element.contains(layer.opener))) {
        layer.opener.focus({ preventScroll: true })
      } else if (active) focusInside(active)
      else document.querySelector<HTMLElement>('[data-dialog-fallback]')?.focus({ preventScroll: true })
    })
  }
}
