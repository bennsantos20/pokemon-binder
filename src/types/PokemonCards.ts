export interface PokemonCard {
    id: string
    name: string
    image?: string
    localId: string
}

export interface CardVariant {
  variantId: string
  type: string
  size: string
}

export interface PokemonCardDetails extends PokemonCard {
  rarity?: string

  set?: {
    id: string
    name: string
  }

  variants_detailed?: CardVariant[]
}

export interface OwnedCard {
  id: string
  cardId: string
  name: string
  image?: string
  localId: string

  set: {
    id: string
    name: string
  }

  variant: CardVariant
  quantity: number
}