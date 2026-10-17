import { useState } from 'react'
import { 
    getCardById,
    searchCards,
} from '../services/tcgdex'
import type {
    CardVariant,
     OwnedCard,
    PokemonCard,
    PokemonCardDetails,
} from '../types/PokemonCards'
import { ArrowLeft, Search, LibraryBig } from 'lucide-react'
interface BinderCardPickerProps {
  slotId: string
  collection: OwnedCard[]
  onClose: () => void
  onPlaceCard: (
    card: PokemonCardDetails,
    variant: CardVariant
  ) => void
}

function BinderCardPicker({
  slotId,
  collection,
  onClose,
  onPlaceCard,
}: BinderCardPickerProps) {
    const [view, setView] = 
      useState<'options' | 'search' | 'collection'>('options')

    const [searchTerm, setSearchTerm] = useState('')
    const [collectionSearchTerm, setCollectionSearchTerm] = useState('')
    const [collectionSetFilter, setCollectionSetFilter] = useState('all')
    const [collectionVariantFilter, setCollectionVariantFilter] = useState('all')
    const [collectionSort, setCollectionSort] = useState<'name' | 'set'>('name')
    const COLLECTION_PAGE_SIZE = 24

    const [visibleCollectionCount, setVisibleCollectionCount] =
      useState(COLLECTION_PAGE_SIZE)
    const [collectionDisplay, setCollectionDisplay] =
      useState<'grid' | 'list'>('grid')
    const [selectedCollectionCard, setSelectedCollectionCard] =
      useState<OwnedCard | null>(null)
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedCard, setSelectedCard] =
        useState<PokemonCardDetails | null>(null)

    const [isLoadingCard, setIsLoadingCard] = useState(false)
    const [selectedVariant, setSelectedVariant] =
        useState<CardVariant | null>(null)

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

async function handleCardSelect(card: PokemonCard) {
  setIsLoadingCard(true)

  try {
    const details = await getCardById(card.id)

    setSelectedCard(details)
    setSelectedVariant(details.variants_detailed?.[0] ?? null)
  } finally {
    setIsLoadingCard(false)
  }
}

const collectionSets = Array.from(
  new Set(collection.map((card) => card.set.name))
).sort((a, b) => a.localeCompare(b))

const collectionVariants = Array.from(
  new Set(collection.map((card) => card.variant.type))
).sort((a, b) => a.localeCompare(b))

const filteredCollection = collection
  .filter((card) => {

    const search = collectionSearchTerm.toLowerCase().trim()

    const matchesSearch =
      card.name.toLowerCase().includes(search) ||
      card.set.name.toLowerCase().includes(search) ||
      card.variant.type.toLowerCase().includes(search) ||
      card.localId.toLowerCase().includes(search)

    const matchesSet =
      collectionSetFilter === 'all' ||
      card.set.name === collectionSetFilter

    const matchesVariant =
      collectionVariantFilter === 'all' ||
      card.variant.type === collectionVariantFilter

    return matchesSearch && matchesSet && matchesVariant
  })
  .sort((a, b) => {
    if (collectionSort === 'set') {
      return (
        a.set.name.localeCompare(b.set.name) ||
        a.name.localeCompare(b.name)
      )
    }

    return (
      a.name.localeCompare(b.name) ||
      a.set.name.localeCompare(b.set.name)
    )
  })

const visibleCollection = filteredCollection.slice(
  0,
  visibleCollectionCount
)

const hasMoreCollectionCards =
  visibleCollectionCount < filteredCollection.length

function handlePlaceCollectionCard() {
  if (!selectedCollectionCard) return

  const cardDetails: PokemonCardDetails = {
    id: selectedCollectionCard.cardId,
    name: selectedCollectionCard.name,
    image: selectedCollectionCard.image,
    localId: selectedCollectionCard.localId,
    set: selectedCollectionCard.set,
  }

  onPlaceCard(cardDetails, selectedCollectionCard.variant)
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

        <p className="binder-picker-selected-pocket">
          Selected pocket:{' '}
          {slotId
            .replace(/^page-(\d+)-slot-(\d+)$/, 'Page $1 · Pocket $2')}
        </p>
    {view === 'options' ? (
        <div className="binder-picker-options">
          <button
            className="binder-picker-option"
            type="button"
            onClick={() => setView('search')}
          >
            <span className="binder-picker-option-icon">
              <Search size={25} strokeWidth={1.8} />
            </span>

            <strong>Search All Cards</strong>

            <span>
              Find any Pokémon card, even if you don't own it.
            </span>
          </button>

          <button
            className="binder-picker-option"
            type="button"
            onClick={() => setView('collection')}
          >
            <span className="binder-picker-option-icon">
              <LibraryBig size={25} strokeWidth={1.8} />
            </span>

            <strong>My Collection</strong>

            <span>
              Choose from cards already in your collection.
            </span>
          </button>
        </div>
    ) : (
  selectedCard ? (
    <div className="binder-placement-preview">
      <button
        type="button"
        className="binder-picker-back"
        onClick={() => {
          setSelectedCard(null)
          setSelectedVariant(null)
        }}
      >
        <ArrowLeft size={17} strokeWidth={2} />
        <span>Back to Results</span>
      </button>

      <div className="binder-placement-card">
        {selectedCard.image && (
          <img
            src={`${selectedCard.image}/high.webp`}
            alt={selectedCard.name}
          />
        )}

        <div className="binder-placement-info">
          <p className="eyebrow">
            {selectedCard.set?.name ?? 'Pokémon Card'}
          </p>

          <h3>{selectedCard.name}</h3>

          <p>
            #{selectedCard.localId}
            {selectedCard.rarity
              ? ` • ${selectedCard.rarity}`
              : ''}
          </p>

          <h4>Choose Variant</h4>

          <div className="binder-variant-options">
            {selectedCard.variants_detailed?.map((variant) => (
              <button
                type="button"
                key={variant.variantId}
                className={
                  selectedVariant?.variantId === variant.variantId
                    ? 'binder-variant-option selected'
                    : 'binder-variant-option'
                }
                onClick={() => setSelectedVariant(variant)}
              >
                {variant.type}
              </button>
            ))}
          </div>
        <button
            className="binder-place-card-button"
            type="button"
            disabled={!selectedVariant}
            onClick={() => {
                if (selectedVariant) {
                    onPlaceCard(selectedCard, selectedVariant)
                }
            }}
        >
            Place in Binder
        </button>
        </div>
      </div>
    </div>
) : (
  <div style={{ display: view === 'collection' ? 'none' : undefined }}>
   <button
      type="button"
      className="binder-picker-back"
      onClick={() => setView('options')}
    >
      <ArrowLeft size={17} strokeWidth={2} />
      <span>Back</span>
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
        onClick={() => handleCardSelect(card)}
        disabled={isLoadingCard}
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
))}

  {view === 'collection' && (
  <div className="binder-collection-picker">
   <button
    type="button"
    className="binder-picker-back"
    onClick={() => setView('options')}
  >
    <ArrowLeft size={17} strokeWidth={2} />
    <span>Back</span>
  </button>

  <h3>My Collection</h3>

<p>
  {collection.length} unique cards in your collection
</p>

<input
  type="text"
  value={collectionSearchTerm}
  onChange={(event) => {
    setCollectionSearchTerm(event.target.value)
    setVisibleCollectionCount(COLLECTION_PAGE_SIZE)
  }}
  placeholder="Search your collection..."
  className="binder-collection-search"
/>

<div className="binder-collection-filters">
  <label htmlFor="binder-collection-set-filter">
    Pokémon Set
  </label>

  <select
    id="binder-collection-set-filter"
    value={collectionSetFilter}
    onChange={(event) => {
      setCollectionSetFilter(event.target.value)
      setVisibleCollectionCount(COLLECTION_PAGE_SIZE)
    }}
  >
    <option value="all">All Sets</option>

    {collectionSets.map((setName) => (
      <option key={setName} value={setName}>
        {setName}
      </option>
    ))}
  </select>
</div>

<div className="binder-collection-extra-filters">
  <div className="binder-collection-filters">
    <label htmlFor="binder-collection-variant-filter">
      Card Variant
    </label>

    <select
      id="binder-collection-variant-filter"
      value={collectionVariantFilter}
      onChange={(event) => {
        setCollectionVariantFilter(event.target.value)
        setVisibleCollectionCount(COLLECTION_PAGE_SIZE)
      }}
    >
      <option value="all">All Variants</option>

      {collectionVariants.map((variant) => (
        <option key={variant} value={variant}>
          {variant}
        </option>
      ))}
    </select>
  </div>

  <div className="binder-collection-filters">
    <label htmlFor="binder-collection-sort">
      Sort By
    </label>

    <select
      id="binder-collection-sort"
      value={collectionSort}
      onChange={(event) => {
        setCollectionSort(event.target.value as 'name' | 'set')
        setVisibleCollectionCount(COLLECTION_PAGE_SIZE)
      }}
    >
      <option value="name">Pokémon Name (A–Z)</option>
      <option value="set">Set Name (A–Z)</option>
    </select>
  </div>
</div>

<div className="binder-collection-toolbar">
  <span>
    Showing {filteredCollection.length} of {collection.length} cards
  </span>

  <div className="binder-collection-view-toggle">
    <button
      type="button"
      className={collectionDisplay === 'grid' ? 'active' : ''}
      onClick={() => setCollectionDisplay('grid')}
      aria-pressed={collectionDisplay === 'grid'}
    >
      ▦ Grid
    </button>

    <button
      type="button"
      className={collectionDisplay === 'list' ? 'active' : ''}
      onClick={() => setCollectionDisplay('list')}
      aria-pressed={collectionDisplay === 'list'}
    >
      ☰ List
    </button>
  </div>
</div>



<div
  className={`binder-collection-grid ${
    collectionDisplay === 'list' ? 'list-view' : ''
  }`}
>
 {visibleCollection.map((card) => (
  <button
    key={card.id}
    type="button"
    className={`binder-collection-card ${
      selectedCollectionCard?.id === card.id ? 'selected' : ''
    }`}
    onClick={() => setSelectedCollectionCard(card)}
    aria-pressed={selectedCollectionCard?.id === card.id}
  >
      {card.image ? (
        <img
          src={`${card.image}/high.webp`}
          alt={card.name}
          loading="lazy"
        />
      ) : (
        <div className="binder-collection-no-image">
          No image
        </div>
      )}

      <strong>{card.name}</strong>

      <span>{card.set.name}</span>

      <span>{card.variant.type}</span>

      <span>Quantity: {card.quantity}</span>
    </button>
  ))}
</div>

{hasMoreCollectionCards && (
  <button
    type="button"
    className="binder-collection-show-more"
    onClick={() =>
      setVisibleCollectionCount((count) => count + COLLECTION_PAGE_SIZE)
    }
  >
    Show More ({Math.min(
      COLLECTION_PAGE_SIZE,
      filteredCollection.length - visibleCollectionCount
    )} more)
  </button>
)}

{filteredCollection.length === 0 && (
  <p>No matching cards found.</p>
)}

{selectedCollectionCard && (
  <div className="binder-collection-selection">
    <p>
      Selected: <strong>{selectedCollectionCard.name}</strong>
      {' — '}
      {selectedCollectionCard.set.name}
      {' ('}
      {selectedCollectionCard.variant.type}
      {')'}
    </p>

    <button
      type="button"
      className="binder-place-card-button"
      onClick={handlePlaceCollectionCard}
    >
      Place in Binder
    </button>
  </div>
)}

  </div>
)}

      </section>
    </div>
  )
}

export default BinderCardPicker