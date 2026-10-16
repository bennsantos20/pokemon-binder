import { useEffect, useState } from 'react'
import { searchCards, getCardById } from './services/tcgdex'
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
import BinderCardActions from './components/BinderCardActions'
import CollectionCardActions from './components/CollectionCardActions'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [isCollectionExpanded, setIsCollectionExpanded] = useState(false)
  const [mainCollectionSearch, setMainCollectionSearch] = useState('')
  const [mainCollectionDisplay, setMainCollectionDisplay] =
    useState<'grid' | 'list'>('grid')
  const [selectedManageCard, setSelectedManageCard] =
    useState<OwnedCard | null>(null)

  const [selectedBinderLocations, setSelectedBinderLocations] =
  useState<{ pageNumber: number; slotNumber: number }[] | null>(null)
  
  const [mainCollectionSetFilter, setMainCollectionSetFilter] =
  useState('all')

const [mainCollectionVariantFilter, setMainCollectionVariantFilter] =
  useState('all')

const [mainCollectionSort, setMainCollectionSort] =
  useState<'name' | 'set'>('name')

const MAIN_COLLECTION_PAGE_SIZE = 24

const [visibleMainCollectionCount, setVisibleMainCollectionCount] =
  useState(MAIN_COLLECTION_PAGE_SIZE)

  const [selectedCard, setSelectedCard] =
  useState<PokemonCardDetails | null>(null)
  
  const [selectedSlotId, setSelectedSlotId] =
    useState<string | null>(null)
    const [selectedOccupiedSlotId, setSelectedOccupiedSlotId] =
  useState<string | null>(null)

  
  const [currentSpread, setCurrentSpread] = useState<number>(() => {
  const savedSpread = localStorage.getItem('pokemon-binder-current-spread')
  const parsedSpread = Number(savedSpread)

  return savedSpread !== null && Number.isInteger(parsedSpread) && parsedSpread >= 0
    ? parsedSpread
    : 0
  })

  const [draggedSlotId, setDraggedSlotId] =
  useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  
function createBinderPage(pageNumber: number): BinderPageType {
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    rows: 3,
    columns: 3,
    slots: Array.from({ length: 9 }, (_, index) => ({
      id: `page-${pageNumber}-slot-${index + 1}`,
      card: null,
    })),
  }
}

const [binderPages, setBinderPages] =
  useState<BinderPageType[]>(() => {
    const savedBinderPages = localStorage.getItem(
      'pokemon-binder-pages'
    )

    if (savedBinderPages) {
      try {
        const pages = JSON.parse(
          savedBinderPages
        ) as BinderPageType[]

        while (pages.length < 40) {
          pages.push(createBinderPage(pages.length + 1))
        }

    return pages
  } catch {
    // Try the old single-page save instead
  }
}


    const savedBinderPage = localStorage.getItem(
      'pokemon-binder-page-1'
    )

    if (savedBinderPage) {
      try {
        const page = JSON.parse(
          savedBinderPage
        ) as BinderPageType

        return [page]
      } catch {
        // Fall back to a fresh binder
      }
    }

    return [
      {
        id: 'page-1',
        pageNumber: 1,
        rows: 3,
        columns: 3,
        slots: Array.from({ length: 9 }, (_, index) => ({
          id: `page-1-slot-${index + 1}`,
          card: null,
        })),
      },
    ]
  })

  const selectedOccupiedSlot = binderPages
  .flatMap((page) => page.slots)
  .find((slot) => slot.id === selectedOccupiedSlotId)

  function getBinderPlacements(card: OwnedCard) {
  return binderPages.flatMap((page) =>
    page.slots.flatMap((slot, slotIndex) => {
      if (!slot.card) return []

      const matchesCard =
        slot.card.cardId === card.cardId &&
        slot.card.variant.variantId === card.variant.variantId

      if (!matchesCard) return []

      return [
        {
          pageNumber: page.pageNumber,
          slotNumber: slotIndex + 1,
        },
      ]
    })
  )
}

function handleJumpToBinderPage(pageNumber: number) {
  const targetSpread = Math.floor(pageNumber / 2)

  setCurrentSpread(targetSpread)

  setSelectedManageCard(null)
  setSelectedSlotId(null)
  setSelectedOccupiedSlotId(null)

  requestAnimationFrame(() => {
    document
      .querySelector('.binder-section')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  })
}

function handleBinderIndicatorClick(
  placements: { pageNumber: number; slotNumber: number }[]
) {
  if (placements.length === 0) return

  if (placements.length === 1) {
    handleJumpToBinderPage(placements[0].pageNumber)
    return
  }

  setSelectedBinderLocations(placements)
}

  const leftPage =
  currentSpread === 0
    ? undefined
    : binderPages[currentSpread * 2 - 1]

const rightPage =
  currentSpread === 0
    ? binderPages[0]
    : binderPages[currentSpread * 2]



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
  const slot = binderPages
    .flatMap((page) => page.slots)
    .find((slot) => slot.id === slotId)

  if (!slot) return

  if (slot.card) {
    setSelectedSlotId(null)
    setSelectedOccupiedSlotId(slotId)
  } else {
    setSelectedOccupiedSlotId(null)
    setSelectedSlotId(slotId)
  }
}

function handleRemoveCardFromBinder() {
  if (!selectedOccupiedSlotId) return

  setBinderPages((currentPages) =>
    currentPages.map((page) => ({
      ...page,
      slots: page.slots.map((slot) =>
        slot.id === selectedOccupiedSlotId
          ? { ...slot, card: null }
          : slot
      ),
    }))
  )

  setSelectedOccupiedSlotId(null)
}

async function handleViewBinderCardDetails() {
  const cardId = selectedOccupiedSlot?.card?.cardId

  if (!cardId) return

  try {
    const cardDetails = await getCardById(cardId)

    setSelectedCard(cardDetails)
    setSelectedOccupiedSlotId(null)
  } catch (error) {
    console.error('Failed to load binder card details:', error)
  }
}

async function handleToggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error('Unable to toggle fullscreen:', error)
  }
}

function handleBinderDragStart(slotId: string) {
  setDraggedSlotId(slotId)
}

function handleBinderDrop(targetSlotId: string) {
  if (!draggedSlotId || draggedSlotId === targetSlotId) {
    setDraggedSlotId(null)
    return
  }

  setBinderPages((currentPages) => {
    const allSlots = currentPages.flatMap((page) => page.slots)

    const sourceSlot = allSlots.find(
      (slot) => slot.id === draggedSlotId
    )

    const targetSlot = allSlots.find(
      (slot) => slot.id === targetSlotId
    )

    if (!sourceSlot?.card || !targetSlot) {
      return currentPages
    }

    const sourceCard = sourceSlot.card
    const targetCard = targetSlot.card

    return currentPages.map((page) => ({
      ...page,
      slots: page.slots.map((slot) => {
        if (slot.id === draggedSlotId) {
          return { ...slot, card: targetCard }
        }

        if (slot.id === targetSlotId) {
          return { ...slot, card: sourceCard }
        }

        return slot
      }),
    }))
  })

  setDraggedSlotId(null)
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

setBinderPages((currentPages) =>
  currentPages.map((page) => ({
    ...page,
    slots: page.slots.map((slot) =>
      slot.id === selectedSlotId
        ? { ...slot, card: binderCard }
        : slot
    ),
  }))
)

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
    'pokemon-binder-pages',
    JSON.stringify(binderPages)
  )
}, [binderPages])

useEffect(() => {
  localStorage.setItem(
    'pokemon-binder-current-spread',
    String(currentSpread)
  )
}, [currentSpread])

useEffect(() => {
  function handleFullscreenChange() {
    setIsFullscreen(Boolean(document.fullscreenElement))
  }

  document.addEventListener(
    'fullscreenchange',
    handleFullscreenChange
  )

  return () => {
    document.removeEventListener(
      'fullscreenchange',
      handleFullscreenChange
    )
  }
}, [])

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

function handleUpdateCollectionQuantity(quantity: number) {
  if (!selectedManageCard) return
  if (!Number.isSafeInteger(quantity) || quantity < 1) return

  setCollection((currentCollection) =>
    currentCollection.map((card) =>
      card.id === selectedManageCard.id
        ? { ...card, quantity }
        : card
    )
  )

  setSelectedManageCard(null)
}


function handleRemoveFromCollection() {
  if (!selectedManageCard) return

  const confirmed = window.confirm(
    `Remove ${selectedManageCard.name} (${selectedManageCard.set.name}) from your collection?\n\nThis will remove all ${selectedManageCard.quantity} owned copies of this entry. Cards already placed in your binder will stay there.`
  )

  if (!confirmed) return

  setCollection((currentCollection) =>
    currentCollection.filter(
      (card) => card.id !== selectedManageCard.id
    )
  )

  setSelectedManageCard(null)
}


const mainCollectionSets = Array.from(
  new Set(collection.map((card) => card.set.name))
).sort((a, b) => a.localeCompare(b))

const mainCollectionVariants = Array.from(
  new Set(collection.map((card) => card.variant.type))
).sort((a, b) => a.localeCompare(b))

const filteredMainCollection = collection
  .filter((card) => {
    const search = mainCollectionSearch.toLowerCase().trim()

    const matchesSearch =
      card.name.toLowerCase().includes(search) ||
      card.set.name.toLowerCase().includes(search) ||
      card.variant.type.toLowerCase().includes(search) ||
      card.localId.toLowerCase().includes(search)

    const matchesSet =
      mainCollectionSetFilter === 'all' ||
      card.set.name === mainCollectionSetFilter

    const matchesVariant =
      mainCollectionVariantFilter === 'all' ||
      card.variant.type === mainCollectionVariantFilter

    return matchesSearch && matchesSet && matchesVariant
  })
  .sort((a, b) => {
    if (mainCollectionSort === 'set') {
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

const visibleMainCollection = filteredMainCollection.slice(
  0,
  visibleMainCollectionCount
)

const hasMoreMainCollectionCards =
  visibleMainCollectionCount < filteredMainCollection.length

return (
  <main
    className={`app ${isPreviewMode ? 'app-preview' : ''} ${
      isFullscreen ? 'app-fullscreen' : ''
    }`}
  >
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

        <p className="collection-count">
          {collection.reduce(
            (total, card) => total + card.quantity,
            0
          )}{' '}
          cards · {collection.length} unique
        </p>
      </div>

     <button
        type="button"
        className="collection-toggle-button"
        onClick={() => setIsCollectionExpanded((current) => !current)}
        aria-expanded={isCollectionExpanded}
        aria-controls="main-collection-content"
    >
      <span>{isCollectionExpanded ? 'Hide Cards' : 'View Collection'}</span>
      <span aria-hidden="true">
        {isCollectionExpanded ? '▲' : '▼'}
      </span>
      </button>
    </div>

   {isCollectionExpanded && (
  <div
    id="main-collection-content"
    className="collection-content"
  >
    <div className="collection-content-heading">
      <div>
        <h3>Your Pokémon Cards</h3>
        <p>Browse and manage the cards you've collected.</p>
      </div>

      <span className="collection-content-count">
        {collection.length} unique cards
      </span>
    </div>

    <div className="main-collection-search-bar">
      <input
        type="text"
        value={mainCollectionSearch}
        onChange={(event) => {
          setMainCollectionSearch(event.target.value)
          setVisibleMainCollectionCount(MAIN_COLLECTION_PAGE_SIZE)
        }}
        placeholder="Search your collection..."
        aria-label="Search your collection"
      />

      {mainCollectionSearch && (
        <button
          type="button"
          onClick={() => {
            setMainCollectionSearch('')
            setVisibleMainCollectionCount(MAIN_COLLECTION_PAGE_SIZE)
          }}
        >
          Clear
        </button>
      )}
    </div>

<div className="main-collection-filters">
  <div className="main-collection-filter">
    <label htmlFor="main-collection-set-filter">
      Pokémon Set
    </label>

    <select
      id="main-collection-set-filter"
      value={mainCollectionSetFilter}
      onChange={(event) => {
        setMainCollectionSetFilter(event.target.value)
        setVisibleMainCollectionCount(MAIN_COLLECTION_PAGE_SIZE)
    }}
    >
      <option value="all">All Sets</option>

      {mainCollectionSets.map((setName) => (
        <option key={setName} value={setName}>
          {setName}
        </option>
      ))}
    </select>
  </div>

  <div className="main-collection-filter">
    <label htmlFor="main-collection-variant-filter">
      Card Variant
    </label>

    <select
      id="main-collection-variant-filter"
      value={mainCollectionVariantFilter}
      onChange={(event) => {
        setMainCollectionVariantFilter(event.target.value)
        setVisibleMainCollectionCount(MAIN_COLLECTION_PAGE_SIZE)
      }}
    >
      <option value="all">All Variants</option>

      {mainCollectionVariants.map((variant) => (
        <option key={variant} value={variant}>
          {variant}
        </option>
      ))}
    </select>
  </div>

  <div className="main-collection-filter">
    <label htmlFor="main-collection-sort">
      Sort By
    </label>

    <select
      id="main-collection-sort"
      value={mainCollectionSort}
      onChange={(event) => {
        setMainCollectionSort(event.target.value as 'name' | 'set')
        setVisibleMainCollectionCount(MAIN_COLLECTION_PAGE_SIZE)
      }}
    >
      <option value="name">Pokémon Name (A–Z)</option>
      <option value="set">Set Name (A–Z)</option>
    </select>
  </div>
</div>

<div className="main-collection-toolbar">
  <span>
    Showing {filteredMainCollection.length} of {collection.length} cards
  </span>

  <div className="main-collection-view-toggle">
    <button
      type="button"
      className={mainCollectionDisplay === 'grid' ? 'active' : ''}
      onClick={() => setMainCollectionDisplay('grid')}
      aria-pressed={mainCollectionDisplay === 'grid'}
    >
      ▦ Grid
    </button>

    <button
      type="button"
      className={mainCollectionDisplay === 'list' ? 'active' : ''}
      onClick={() => setMainCollectionDisplay('list')}
      aria-pressed={mainCollectionDisplay === 'list'}
    >
      ☰ List
    </button>
  </div>
</div>

   <div
    className={`collection-grid ${
      mainCollectionDisplay === 'list' ? 'main-list-view' : ''
    }`}
  >
          {visibleMainCollection.map((card) => (
            <CollectionCard
              key={card.id}
              card={card}
              onManage={setSelectedManageCard}
              binderPlacements={getBinderPlacements(card)}
              onBinderClick={handleBinderIndicatorClick}
            />
          ))}
        </div>
        
        {hasMoreMainCollectionCards && (
          <button
            type="button"
            className="main-collection-show-more"
            onClick={() =>
              setVisibleMainCollectionCount(
                (count) => count + MAIN_COLLECTION_PAGE_SIZE
              )
            }
          >
            Show More (
            {Math.min(
              MAIN_COLLECTION_PAGE_SIZE,
              filteredMainCollection.length - visibleMainCollectionCount
            )} more)
        </button>
        )}

        {filteredMainCollection.length === 0 && (
          <p className="main-collection-empty">
          No matching cards found. Try another search!
        </p>
      )}
      </div>
    )}
  </section>
)}

      <section className="binder-section">
        <div className="binder-section-header">
          <p className="eyebrow">BINDER DESIGNER</p>
          <h2>My Binder</h2>
        </div>

        <div className="binder-view-controls">
          <button
            type="button"
            onClick={async () => {
              if (isPreviewMode && document.fullscreenElement) {
                await document.exitFullscreen()
              }

              setIsPreviewMode((current) => !current)
              setSelectedSlotId(null)
              setSelectedOccupiedSlotId(null)
            }}
          >
            {isPreviewMode ? '✏️ Back to Designer' : '👁️ Preview Binder'}
        </button>

        {isPreviewMode && (
          <button
            type="button"
            onClick={handleToggleFullscreen}
          >
            {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Enter Fullscreen'}
          </button>
          )}
        </div>

         <BinderSpread
          leftPage={leftPage}
          rightPage={rightPage}
          onSlotClick={handleBinderSlotClick}
          onDragStart={handleBinderDragStart}
          onDrop={handleBinderDrop}
          isPreviewMode={isPreviewMode}
          />

          <div className="binder-navigation">
            <button
              type="button"
              onClick={() =>
              setCurrentSpread((spread) =>
                spread === 0
                  ? Math.ceil(binderPages.length / 2)
                  : spread - 1
              )
            }
          >
            {currentSpread === 0 ? '↺ Back' : '← Previous'}
          </button>

          <select
            className="binder-page-selector"
            value={currentSpread}
            onChange={(event) =>
            setCurrentSpread(Number(event.target.value))
            }
          >
          {Array.from(
            { length: Math.ceil(binderPages.length / 2) + 1 },
            (_, spread) => {
              const label =
                spread === 0
                  ? 'Front / Page 1'
                  : spread === Math.ceil(binderPages.length / 2)
                    ? `Page ${binderPages.length} / Back`
                    : `Pages ${spread * 2}–${spread * 2 + 1}`

              return (
                <option key={spread} value={spread}>
                  {label}
              </option>
      )
    }
  )}
</select>

            <button
              type="button"
              onClick={() =>
              setCurrentSpread((spread) =>
              spread === Math.ceil(binderPages.length / 2)
                ? 0
                : spread + 1
              )
            }
            >
              {currentSpread === Math.ceil(binderPages.length / 2)
                ? 'Front ↻'
                : 'Next →'}
            </button>
          </div>

      </section>

    {selectedSlotId && (
      <BinderCardPicker
        slotId={selectedSlotId}
        collection={collection}
        onClose={() => setSelectedSlotId(null)}
        onPlaceCard={handlePlaceCardInBinder}
      />
    )}

    {selectedOccupiedSlot?.card && (
  <BinderCardActions
    card={selectedOccupiedSlot.card}
    onClose={() => setSelectedOccupiedSlotId(null)}
    onViewDetails={handleViewBinderCardDetails}
    onReplace={() => {
      setSelectedSlotId(selectedOccupiedSlotId)
      setSelectedOccupiedSlotId(null)
    }}
    onAddToCollection={() => {
      console.log('Add to collection:', selectedOccupiedSlot.card)
    }}
    onRemove={handleRemoveCardFromBinder}
  />
)}

    {selectedCard && (
      <CardDetailsModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onAdd={handleAddToCollection}
      />
)}


{selectedManageCard && (
  <CollectionCardActions
    card={selectedManageCard}
    onClose={() => setSelectedManageCard(null)}
    onViewDetails={() => {
      console.log('View collection card:', selectedManageCard)
    }}
    onManageQuantity={handleUpdateCollectionQuantity}
    onRemove={handleRemoveFromCollection}
  />
)}

{selectedBinderLocations && (
  <div
    className="binder-locations-overlay"
    onClick={() => setSelectedBinderLocations(null)}
  >
    <div
      className="binder-locations-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Choose binder location"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="binder-locations-header">
        <h3>Choose Binder Location</h3>

        <button
          type="button"
          onClick={() => setSelectedBinderLocations(null)}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <p>This card appears in multiple binder pockets.</p>

      <div className="binder-locations-list">
        {selectedBinderLocations.map((location) => (
          <button
            type="button"
            key={`${location.pageNumber}-${location.slotNumber}`}
            onClick={() => {
              setSelectedBinderLocations(null)
              handleJumpToBinderPage(location.pageNumber)
            }}
          >
            📖 Page {location.pageNumber} · Slot {location.slotNumber}
            <span>→</span>
          </button>
        ))}
      </div>
    </div>
  </div>
)}


  </main>
)
}

export default App