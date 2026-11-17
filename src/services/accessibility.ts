import type { BinderCard, BinderPage, OwnedCard } from '../types/PokemonCards'

export function binderViewLabel(pageCount: number, isMobile: boolean, mobilePage: number, currentSpread: number) {
  if (isMobile) return `Page ${mobilePage}`
  if (currentSpread === 0) return 'Front / Page 1'
  if (currentSpread === Math.ceil(pageCount / 2)) return `Page ${pageCount} / Back`
  return `Pages ${currentSpread * 2}–${currentSpread * 2 + 1}`
}

export interface AccessibilitySnapshot {
  pages: BinderPage[]
  collection: OwnedCard[]
  viewLabel: string
}
const cardLabel = (card: BinderCard) => `${card.name} (${card.variant.type})`
function pockets(pages: BinderPage[]) {
  return pages.flatMap(page => page.slots.map((slot, index) => ({
    ...slot, location: `Page ${page.pageNumber}, pocket ${index + 1}`,
  })))
}

/** Describe committed state changes only; never writes data or predicts a successful action. */
export function accessibilityChanges(before: AccessibilitySnapshot, after: AccessibilitySnapshot): string {
  const messages: string[] = []
  if (before.pages !== after.pages) {
    const previous = new Map(pockets(before.pages).map(slot => [slot.id, slot]))
    const changes = pockets(after.pages).flatMap(slot => {
      const old = previous.get(slot.id)
      return old && old.card !== slot.card ? [{ before: old, after: slot }] : []
    })
    const [a, b] = changes
    if (changes.length === 2 && a.before.card && b.before.card &&
      a.after.card === b.before.card && b.after.card === a.before.card) {
      messages.push(`Swapped ${cardLabel(a.before.card)} on ${a.before.location} with ${cardLabel(b.before.card)} on ${b.before.location}.`)
    } else if (changes.length === 2 && (
      (a.before.card && !a.after.card && !b.before.card && b.after.card === a.before.card) ||
      (b.before.card && !b.after.card && !a.before.card && a.after.card === b.before.card))) {
      const source = a.before.card ? a : b
      const target = source === a ? b : a
      messages.push(`Moved ${cardLabel(source.before.card!)} from ${source.before.location} to ${target.after.location}.`)
    } else if (changes.length > 3) {
      messages.push(`Updated ${changes.length} binder pockets.`)
    } else {
      for (const { before: old, after: slot } of changes) {
        if (!slot.card && old.card) messages.push(`Removed ${cardLabel(old.card)} from ${old.location}.`)
        else if (slot.card && old.card) messages.push(`Replaced ${cardLabel(old.card)} with ${cardLabel(slot.card)} on ${slot.location}.`)
        else if (slot.card) messages.push(`Placed ${cardLabel(slot.card)} on ${slot.location}.`)
      }
    }
    const renamed = after.pages.filter(page => {
      const old = before.pages.find(previousPage => previousPage.pageNumber === page.pageNumber)
      return old && (old.name ?? '') !== (page.name ?? '')
    })
    if (renamed.length > 3) messages.push(`Updated ${renamed.length} binder page names.`)
    else for (const page of renamed) messages.push(page.name ? `Page ${page.pageNumber} named ${page.name}.` : `Page ${page.pageNumber} name cleared.`)
  }
  if (before.collection !== after.collection) {
    const previous = new Map(before.collection.map(card => [card.id, card]))
    const current = new Map(after.collection.map(card => [card.id, card]))
    const changes: string[] = []
    for (const card of after.collection) {
      const old = previous.get(card.id)
      if (!old) changes.push(`Added ${cardLabel(card)} to My Collection. Owned quantity: ${card.quantity}.`)
      else if (old.quantity !== card.quantity) changes.push(`${cardLabel(card)} owned quantity updated to ${card.quantity}.`)
    }
    for (const card of before.collection) {
      if (!current.has(card.id)) changes.push(`Removed ${cardLabel(card)} from My Collection.`)
    }
    messages.push(...(changes.length > 3 ? ['Collection inventory updated.'] : changes))
  }
  if (before.viewLabel !== after.viewLabel) messages.push(`Viewing ${after.viewLabel}.`)
  return messages.join(' ')
}
