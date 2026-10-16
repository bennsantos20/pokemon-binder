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

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [isCollectionExpanded, setIsCollectionExpanded] = useState(false)
  
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
        onClick={() => setIsCollectionExpanded((current) => !current)}
        aria-expanded={isCollectionExpanded}
        aria-controls="main-collection-content"
      >
        {isCollectionExpanded ? '▲ Collapse' : '▼ Expand'}
      </button>
    </div>

    {isCollectionExpanded && (
      <div id="main-collection-content">
        <div className="collection-grid">
          {collection.map((card) => (
            <CollectionCard
              key={card.id}
              card={card}
            />
          ))}
        </div>
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

  </main>
)
}

export default App