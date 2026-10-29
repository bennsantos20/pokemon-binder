import type { CardVariant } from '../types/PokemonCards'

// Reserved application namespace: never use a server ID for an unknown printing.
export const UNSPECIFIED_VARIANT: CardVariant = Object.freeze({
  variantId: 'urn:pokemon-binder:printing:unspecified:v1',
  type: 'Printing Unspecified',
  size: 'unknown',
})
export const VARIANTS_UNAVAILABLE_MESSAGE = 'Printing information is unavailable. This does not mean the card is unavailable.'

function usable(value: unknown): value is CardVariant {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return ['variantId', 'type', 'size'].every(key => typeof item[key] === 'string' && item[key].trim().length > 0) &&
    !(item.variantId as string).startsWith('urn:pokemon-binder:')
}

export function resolveVariants(metadata: unknown) {
  const candidates: CardVariant[] = Array.isArray(metadata) ? metadata.filter(usable) : []
  // Conflicting duplicate IDs cannot safely identify a printing in inventory.
  const counts = new Map<string, number>()
  for (const item of candidates) counts.set(item.variantId, (counts.get(item.variantId) ?? 0) + 1)
  const variants = candidates.filter(item => counts.get(item.variantId) === 1)
  return {
    variants: variants.length ? variants : [UNSPECIFIED_VARIANT],
    unavailable: variants.length === 0,
    initialSelection: variants[0] ?? null,
  }
}

export function variantLabel(variant: CardVariant): string {
  if (variant.variantId === UNSPECIFIED_VARIANT.variantId) return 'Printing Unspecified'
  const item = variant as CardVariant & Record<string, unknown>
  const name = variant.type === 'normal' ? 'Normal' : variant.type === 'reverse' ? 'Reverse Holo' : variant.type === 'holo' ? 'Holo' : variant.type
  const parts = [name, variant.size]
  for (const key of ['subtype', 'stamp', 'foil', 'languages']) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) parts.push(`${key}: ${value}`)
    else if (Array.isArray(value) && value.every(v => typeof v === 'string') && value.length) parts.push(`${key}: ${value.join(', ')}`)
  }
  return parts.join(' · ')
}

export function variantOptionLabel(variant: CardVariant, variants: CardVariant[]) {
  const label = variantLabel(variant)
  // If metadata still cannot distinguish them, expose the actual ID rather than
  // inventing a printing description.
  return variants.filter(other => variantLabel(other) === label).length > 1
    ? `${label} · ID: ${variant.variantId}` : label
}
