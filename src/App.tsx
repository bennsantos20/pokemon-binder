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

  const ownedCard: OwnedCard = {
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
    quantity: 1,
  }

  setCollection((currentCollection) => [
    ...currentCollection,
    ownedCard,
  ])

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