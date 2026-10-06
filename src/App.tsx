import { useState } from 'react'
import { getCardById, searchCards } from './services/tcgdex'
import type { 
  CardVariant,
  OwnedCard,
  PokemonCard,
  PokemonCardDetails,
 } from './types/PokemonCards'
import CardSearchResult from './components/CardSearchResult'
import './App.css'
import CardDetailsModal from './components/CardDetailsModal'
import CollectionCard from './components/CollectionCard'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [selectedCard, setSelectedCard] =
  useState<PokemonCardDetails | null>(null)
  const [collection, setCollection] = useState<OwnedCard[]>([])

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