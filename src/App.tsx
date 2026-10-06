import { useEffect, useState } from 'react'
import { getCardById, searchCards } from './services/tcgdex'
import type { 
  BinderCard,
  BinderPage as BinderPageType,
  CardVariant,
  OwnedCard,
  PokemonCard,
  PokemonCardDetails,
 } from './types/PokemonCards'
import CardSearchResult from './components/CardSearchResult'
import './App.css'
import CardDetailsModal from './components/CardDetailsModal'
import CollectionCard from './components/CollectionCard'
import BinderSpread from './components/BinderSpread'
import BinderCardPicker from './components/BinderCardPicker'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [selectedCard, setSelectedCard] =
  useState<PokemonCardDetails | null>(null)
  const [selectedSlotId, setSelectedSlotId] =
  useState<string | null>(null)
const [firstBinderPage, setFirstBinderPage] =
  useState<BinderPageType>(() => {
    const savedBinderPage = localStorage.getItem(
      'pokemon-binder-page-1'
    )

    if (savedBinderPage) {
      try {
        return JSON.parse(savedBinderPage) as BinderPageType
      } catch {
        // Fall back to a fresh binder page
      }
    }

    return {
      id: 'page-1',
      pageNumber: 1,
      rows: 3,
      columns: 3,
      slots: Array.from({ length: 9 }, (_, index) => ({
        id: `page-1-slot-${index + 1}`,
        card: null,
      })),
    }
  })



  const [collection, setCollection] = useState<OwnedCard[]>(() => {
  const savedCollection = localStorage.getItem('pokemon-binder-collection')


  if (!savedCollection) {
    return []
  }

  try {
    return JSON.parse(savedCollection) as OwnedCard[]
  } catch {
    return []
  }
})

function handleBinderSlotClick(slotId: string) {
  setSelectedSlotId(slotId)
}

function handlePlaceCardInBinder(
  card: PokemonCardDetails,
  variant: CardVariant
) {
  if (!selectedSlotId || !card.set) return

  const binderCard: BinderCard = {
    id: `${card.id}-${variant.variantId}`,
    cardId: card.id,
    name: card.name,
    image: card.image,
    localId: card.localId,
    set: {
      id: card.set.id,
      name: card.set.name,
    },
    variant,
  }

  setFirstBinderPage((currentPage) => ({
    ...currentPage,
    slots: currentPage.slots.map((slot) =>
      slot.id === selectedSlotId
        ? { ...slot, card: binderCard }
        : slot
    ),
  }))

  setSelectedSlotId(null)
}


useEffect(() => {
  localStorage.setItem(
    'pokemon-binder-collection',
    JSON.stringify(collection)
  )
}, [collection])

useEffect(() => {
  localStorage.setItem(
    'pokemon-binder-page-1',
    JSON.stringify(firstBinderPage)
  )
}, [firstBinderPage])

async function handleSearch() {
  const results = await searchCards(searchTerm)
  setCards(results)
}

async function handleAddCard(card: PokemonCard) {
  const details = await getCardById(card.id)
  setSelectedCard(details)
}

function handleAddToCollection(
  card: PokemonCardDetails,
  variant: CardVariant
) {
  if (!card.set) {
    return
  }

  const cardSet = card.set

  const ownedCardId = `${card.id}-${variant.variantId}`

  setCollection((currentCollection) => {
    const existingCard = currentCollection.find(
      (ownedCard) => ownedCard.id === ownedCardId
    )

    if (existingCard) {
      return currentCollection.map((ownedCard) =>
        ownedCard.id === ownedCardId
          ? {
              ...ownedCard,
              quantity: ownedCard.quantity + 1,
            }
          : ownedCard
      )
    }

    const ownedCard: OwnedCard = {
      id: ownedCardId,
      cardId: card.id,
      name: card.name,
      image: card.image,
      localId: card.localId,
      set: {
        id: cardSet.id,
        name: cardSet.name,
      },
      variant,
      quantity: 1,
    }

    return [...currentCollection, ownedCard]
  })

  setSelectedCard(null)
}

return (
  <main className="app">
    <header className="app-header">
      <p className="eyebrow">POKÉMON TCG BINDER PLANNER</p>
      <h1>Pokémon Binder</h1>
      <p className="subtitle">
        Build your binder before moving a single card.
      </p>
      <div className="collection-summary">
        <span>Collection</span>
        <strong>{collection.length}</strong>
      </div>
    </header>

    <section className="search-section">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search Pokémon cards..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <button onClick={handleSearch}>
          Search
        </button>
      </div>

      {cards.length > 0 && (
        <p className="results-count">
          {cards.length} cards found
        </p>
      )}
    </section>

    <section className="card-grid">
      {cards.map((card) => (
        <CardSearchResult
          key={card.id}
          card={card}
          onAdd={handleAddCard}
        />
      ))}
    </section>

    {collection.length > 0 && (
  <section className="collection-section">
    <div className="collection-header">
      <div>
        <p className="eyebrow">YOUR CARDS</p>
        <h2>My Collection</h2>
      </div>

      <p className="collection-count">
        {collection.reduce(
          (total, card) => total + card.quantity,
          0
        )}{' '}
        cards • {collection.length} unique
      </p>
    </div>

    <div className="collection-grid">
      {collection.map((card) => (
        <CollectionCard
          key={card.id}
          card={card}
        />
      ))}
    </div>
  </section>
)}

      <section className="binder-section">
        <div className="binder-section-header">
          <p className="eyebrow">BINDER DESIGNER</p>
          <h2>My Binder</h2>
        </div>

         <BinderSpread
          rightPage={firstBinderPage}
          onSlotClick={handleBinderSlotClick}
          />

      </section>

    {selectedSlotId && (
      <BinderCardPicker
        slotId={selectedSlotId}
        onClose={() => setSelectedSlotId(null)}
        onPlaceCard={handlePlaceCardInBinder}
      />
    )}

    {selectedCard && (
      <CardDetailsModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onAdd={handleAddToCollection}
      />
)}

  </main>
)
}

export default App