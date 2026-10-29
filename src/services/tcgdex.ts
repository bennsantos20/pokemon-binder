import type {
  PokemonCard,
  PokemonCardDetails,
} from '../types/PokemonCards'

const API_BASE_URL = 'https://api.tcgdex.net/v2/en'

export async function searchCards(name: string, signal?: AbortSignal): Promise<PokemonCard[]> {
  const response = await fetch(
    `${API_BASE_URL}/cards?name=${encodeURIComponent(name)}`,
    { signal }
  )

  if (!response.ok) {
    throw new Error('Failed to search for Pokémon cards')
  }

  const cards: PokemonCard[] = await response.json()

  return cards
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

  return response.json()
}