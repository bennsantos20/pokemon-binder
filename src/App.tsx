import { useState } from 'react'
import { getCardById, searchCards } from './services/tcgdex'
import type { PokemonCard } from './types/PokemonCards'
import CardSearchResult from './components/CardSearchResult'
import './App.css'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cards, setCards] = useState<PokemonCard[]>([])

async function handleSearch() {
  const results = await searchCards(searchTerm)
  setCards(results)
}

async function handleAddCard(card: PokemonCard) {
  const details = await getCardById(card.id)

  console.log('SELECTED CARD:', details)
}

return (
  <main className="app">
    <header className="app-header">
      <p className="eyebrow">POKÉMON TCG BINDER PLANNER</p>
      <h1>Pokémon Binder</h1>
      <p className="subtitle">
        Build your binder before moving a single card.
      </p>
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
  </main>
)
}

export default App