import type {
  PokemonCard,
  PokemonCardDetails,
} from '../types/PokemonCards'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

// Identity is required; optional display metadata must never make JSX unsafe.
function validateCard(value: unknown): PokemonCardDetails {
  if (!record(value) || !text(value.id) || !text(value.name) || !text(value.localId)) {
    throw new Error('TCGdex returned invalid card data. Please try again.')
  }
  const card = { ...value }
  for (const key of ['image', 'rarity']) {
    if (!text(card[key])) delete card[key]
  }
  if (!record(card.set) || !text(card.set.id) || !text(card.set.name)) delete card.set
  // Detailed printings are resolved separately, including Printing Unspecified.
  return card as unknown as PokemonCardDetails
}

const API_BASE_URL = 'https://api.tcgdex.net/v2/en'

export async function searchCards(name: string, signal?: AbortSignal): Promise<PokemonCard[]> {
  const response = await fetch(
    `${API_BASE_URL}/cards?name=${encodeURIComponent(name)}`,
    { signal }
  )

  if (!response.ok) {
    throw new Error('Failed to search for Pokémon cards')
  }

  const cards: unknown = await response.json()
  if (!Array.isArray(cards)) throw new Error('TCGdex returned invalid search results. Please try again.')
  return cards.map(validateCard)
}

export async function getCardById(
  id: string,
  signal?: AbortSignal
): Promise<PokemonCardDetails> {
  const response = await fetch(
    `${API_BASE_URL}/cards/${encodeURIComponent(id)}`,
    { signal }
  )

  if (!response.ok) {
    throw new Error('Failed to load Pokémon card details')
  }

  const card = validateCard(await response.json())
  if (card.id !== id) throw new Error('TCGdex returned the wrong card. Please try again.')
  return card
}
