import { useState } from 'react'
import { searchCards } from '../services/tcgdex'
import type { PokemonCard } from '../types/PokemonCards'

interface BinderCardPickerProps {
  slotId: string
  onClose: () => void
}

function BinderCardPicker({
  slotId,
  onClose,
}: BinderCardPickerProps) {
    const [view, setView] = useState<'options' | 'search'>('options')

    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([])
    const [isSearching, setIsSearching] = useState(false)

    async function handleSearch() {
  if (!searchTerm.trim()) {
    return
  }

  setIsSearching(true)

  try {
    const results = await searchCards(searchTerm)
    setSearchResults(results)
  } finally {
    setIsSearching(false)
  }
}

    
  return (
    <div
      className="binder-picker-backdrop"
      onClick={onClose}
    >
      <section
        className="binder-card-picker"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="binder-picker-header">
          <div>
            <p className="eyebrow">BINDER DESIGNER</p>
            <h2>Add a Card</h2>
          </div>

          <button
            className="binder-picker-close"
            type="button"
            onClick={onClose} 
            aria-label="Close card picker"
          >
            ×
          </button>
        </div>

        <p className="binder-picker-slot">
          Selected pocket: {slotId}
        </p>
    {view === 'options' ? (
        <div className="binder-picker-options">
          <button
            className="binder-picker-option"
            type="button"
            onClick={() => setView('search')}
          >
            <span className="binder-picker-option-icon">
              🔍
            </span>

            <strong>Search All Cards</strong>

            <span>
              Find any Pokémon card, even if you don't own it.
            </span>
          </button>

          <button
            className="binder-picker-option"
            type="button"
          >
            <span className="binder-picker-option-icon">
              🃏
            </span>

            <strong>My Collection</strong>

            <span>
              Choose from cards already in your collection.
            </span>
          </button>
        </div>
    ) : (
  <div>
    <button
      type="button"
      onClick={() => setView('options')}
    >
      ← Back
    </button>

        <h3>Search All Cards</h3>

<form
  className="binder-card-search"
  onSubmit={(event) => {
    event.preventDefault()
    handleSearch()
  }}
>
  <input
    type="text"
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
    placeholder="Search Pokémon cards..."
    autoFocus
  />

  <button
    type="submit"
    disabled={isSearching}
  >
    {isSearching ? 'Searching...' : 'Search'}
  </button>
</form>

{searchResults.length > 0 && (
  <p className="binder-search-count">
    {searchResults.length} cards found
  </p>
)}

{searchResults.length > 0 && (
  <div className="binder-search-results">
    {searchResults.map((card) => (
      <button
        className="binder-search-result"
        type="button"
        key={card.id}
      >
        {card.image ? (
          <img
            src={`${card.image}/high.webp`}
            alt={card.name}
          />
        ) : (
          <div className="binder-search-image-placeholder">
            No image
          </div>
        )}

        <div className="binder-search-result-info">
          <strong>{card.name}</strong>
          <span>#{card.localId}</span>
        </div>
      </button>
    ))}
  </div>
)}


  </div>
)}



      </section>
    </div>
  )
}

export default BinderCardPicker