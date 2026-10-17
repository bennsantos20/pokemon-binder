import { useEffect,useRef, useState } from 'react'
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
import { BookOpen, ChevronDown, Check, Pencil, X, Eye, ArrowLeft, Maximize2, Trash2, Info} from 'lucide-react'
import CollectionBinderPlacement from './components/CollectionBinderPlacement'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [cards, setCards] = useState<PokemonCard[]>([])
  const [mainSearchView, setMainSearchView] =
    useState<'grid' | 'list'>('grid')
  
  const [isCollectionExpanded, setIsCollectionExpanded] =
    useState<boolean>(() => {
      const savedPreference = localStorage.getItem(
        'pokemon-binder-collection-expanded'
      )

      return savedPreference === 'true'
    })

  const [mainCollectionSearch, setMainCollectionSearch] = useState('')
  const [mainCollectionDisplay, setMainCollectionDisplay] =
    useState<'grid' | 'list'>('grid')
  const [selectedManageCard, setSelectedManageCard] =
    useState<OwnedCard | null>(null)
  const [selectedCardToPlace, setSelectedCardToPlace] =
    useState<OwnedCard | null>(null)
  const [isRemoveCollectionConfirmOpen, setIsRemoveCollectionConfirmOpen] =
  useState(false)

  const [selectedBinderLocations, setSelectedBinderLocations] =
  useState<{ pageNumber: number; slotNumber: number }[] | null>(null)

  const [highlightedBinderSlotId, setHighlightedBinderSlotId] =
  useState<string | null>(null)

useEffect(() => {
  if (!highlightedBinderSlotId) return

  const timeout = window.setTimeout(() => {
    setHighlightedBinderSlotId(null)
  }, 5000)

  return () => window.clearTimeout(timeout)
}, [highlightedBinderSlotId])

  
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

const [mobilePage, setMobilePage] = useState(1)

const [isMobile, setIsMobile] = useState(
  () => window.matchMedia('(max-width: 800px)').matches
)

useEffect(() => {
  const mediaQuery = window.matchMedia('(max-width: 800px)')

  const handleChange = () => {
    setIsMobile(mediaQuery.matches)
  }

  mediaQuery.addEventListener('change', handleChange)

  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}, [])

const [isPageNavigatorOpen, setIsPageNavigatorOpen] =
  useState(false)

const [pageNavigatorSearch, setPageNavigatorSearch] = useState('')

const pageNavigatorRef = useRef<HTMLDivElement>(null)
const activePageOptionRef = useRef<HTMLButtonElement>(null)
const [renamingPageNumber, setRenamingPageNumber] =
  useState<number | null>(null)

const [renamePageValue, setRenamePageValue] =
  useState('')

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

        return [
          page,
          ...Array.from({ length: 39 }, (_, index) =>
            createBinderPage(index + 2)
          ),
        ]
      } catch {
        // Fall back to a fresh binder
      }
    }

      return Array.from({ length: 40 }, (_, index) =>
        createBinderPage(index + 1)
      )
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


function highlightBinderLocation(
  location: { pageNumber: number; slotNumber: number }
) {
  const slotId =
    `page-${location.pageNumber}-slot-${location.slotNumber}`

  // Remove the previous highlight so it can restart.
  setHighlightedBinderSlotId(null)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setHighlightedBinderSlotId(slotId)
    })
  })
}


function handleJumpToBinderPage(pageNumber: number) {
  const targetSpread = Math.floor(pageNumber / 2)

  setCurrentSpread(targetSpread)
  setMobilePage(pageNumber)

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

function handleTogglePageNavigator() {
  setPageNavigatorSearch('')
  setIsPageNavigatorOpen((current) => !current)
}


function handleRenameBinderPage(pageNumber: number) {
  const page = binderPages.find(
    (binderPage) => binderPage.pageNumber === pageNumber
  )

  if (!page) return

  setRenamingPageNumber(pageNumber)
  setRenamePageValue(page.name ?? '')
}

function handleSaveBinderPageName() {
  if (renamingPageNumber === null) return

  const trimmedName = renamePageValue.trim().slice(0, 40)

  setBinderPages((currentPages) =>
    currentPages.map((page) =>
      page.pageNumber === renamingPageNumber
        ? { ...page, name: trimmedName }
        : page
    )
  )

  setRenamingPageNumber(null)
  setRenamePageValue('')
}

function handleCancelBinderPageRename() {
  setRenamingPageNumber(null)
  setRenamePageValue('')
}


function handleBinderIndicatorClick(
  placements: { pageNumber: number; slotNumber: number }[]
) {
  if (placements.length === 0) return

  
if (placements.length === 1) {
  const location = placements[0]

  highlightBinderLocation(location)
  handleJumpToBinderPage(location.pageNumber)
  return
}


  setSelectedBinderLocations(placements)
}

const leftPage = isMobile
  ? undefined
  : currentSpread === 0
    ? undefined
    : binderPages[currentSpread * 2 - 1]

const rightPage = isMobile
  ? binderPages[mobilePage - 1]
  : currentSpread === 0
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

const ownedCardIds = new Set(
  collection
    .filter((card) => card.quantity > 0)
    .map((card) => card.id)
)

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

async function handleViewCollectionCardDetails() {
  if (!selectedManageCard) return

  try {
    const details = await getCardById(selectedManageCard.cardId)

    setSelectedCard(details)
    setSelectedManageCard(null)
  } catch (error) {
    console.error('Failed to load collection card details:', error)
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

function handlePlaceCollectionCardInBinder(
  pageNumber: number,
  slotId: string
) {
  if (!selectedCardToPlace) return

  const targetPage = binderPages.find(
    (page) => page.pageNumber === pageNumber
  )

  const targetSlot = targetPage?.slots.find(
    (slot) => slot.id === slotId
  )

if (!targetSlot) return

  const card = selectedCardToPlace

  const binderCard: BinderCard = {
    id: `${card.cardId}-${card.variant.variantId}`,
    cardId: card.cardId,
    name: card.name,
    image: card.image,
    localId: card.localId,
    set: card.set,
    variant: card.variant,
  }

  setBinderPages((currentPages) =>
    currentPages.map((page) =>
      page.pageNumber === pageNumber
        ? {
            ...page,
            slots: page.slots.map((slot) =>
              slot.id === slotId
                ? { ...slot, card: binderCard }
                : slot
            ),
          }
        : page
    )
  )

  setSelectedCardToPlace(null)
}

useEffect(() => {
  localStorage.setItem(
    'pokemon-binder-collection',
    JSON.stringify(collection)
  )
}, [collection])


useEffect(() => {
  localStorage.setItem(
    'pokemon-binder-collection-expanded',
    String(isCollectionExpanded)
  )
}, [isCollectionExpanded])

useEffect(() => {
  if (!isPageNavigatorOpen) return

  function handlePointerDown(event: PointerEvent) {
    if (
      pageNavigatorRef.current &&
      !pageNavigatorRef.current.contains(event.target as Node)
    ) {
      setIsPageNavigatorOpen(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setIsPageNavigatorOpen(false)
    }
  }

  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeyDown)

  activePageOptionRef.current?.scrollIntoView({
    block: 'nearest',
    behavior: 'instant',
  })

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('keydown', handleKeyDown)
  }
}, [isPageNavigatorOpen])


useEffect(() => {
  if (renamingPageNumber === null) return

  function handleRenameEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setRenamingPageNumber(null)
      setRenamePageValue('')
    }
  }

  document.addEventListener('keydown', handleRenameEscape)

  return () => {
    document.removeEventListener('keydown', handleRenameEscape)
  }
}, [renamingPageNumber])


useEffect(() => {
  localStorage.setItem(
    'pokemon-binder-pages',
    JSON.stringify(binderPages)
  )
}, [binderPages])


useEffect(() => {
  if (!isRemoveCollectionConfirmOpen) return

  function handleRemoveConfirmationEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopImmediatePropagation()
      handleCancelRemoveFromCollection()
    }
  }

  document.addEventListener(
    'keydown',
    handleRemoveConfirmationEscape
  )

  return () => {
    document.removeEventListener(
      'keydown',
      handleRemoveConfirmationEscape
    )
  }
}, [isRemoveCollectionConfirmOpen])


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
  const trimmedSearch = searchTerm.trim()

  if (!trimmedSearch) {
    setCards([])
    return
  }

  const results = await searchCards(trimmedSearch)
  setCards(results)
}

function handleClearSearch() {
  setSearchTerm('')
  setCards([])
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


function handleAddBinderCardToCollection() {
  if (!selectedOccupiedSlot?.card) return

  const card = selectedOccupiedSlot.card
  const ownedCardId = `${card.cardId}-${card.variant.variantId}`

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
      cardId: card.cardId,
      name: card.name,
      image: card.image,
      localId: card.localId,
      set: card.set,
      variant: card.variant,
      quantity: 1,
    }

    return [...currentCollection, ownedCard]
  })

  setSelectedOccupiedSlotId(null)
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

  setIsRemoveCollectionConfirmOpen(true)
}

function handleConfirmRemoveFromCollection() {
  if (!selectedManageCard) return

  setCollection((currentCollection) =>
    currentCollection.filter(
      (card) => card.id !== selectedManageCard.id
    )
  )

  setIsRemoveCollectionConfirmOpen(false)
  setSelectedManageCard(null)
}

function handleCancelRemoveFromCollection() {
  setIsRemoveCollectionConfirmOpen(false)
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
        Property of Noli Santos
      </p>
      <div className="collection-summary">
        <span>Collection</span>
        <strong>{collection.length}</strong>
      </div>
    </header>





      <section className="binder-section">
        <div className="binder-section-header">
          <p className="eyebrow">BINDER DESIGNER</p>
          <h2>My Binder</h2>
        </div>

        <div className="binder-view-controls">
          <button
            type="button"
            className={`binder-view-button ${
              isPreviewMode ? 'binder-view-button-back' : 'binder-view-button-preview'
            }`}
            
            onClick={async () => {
              const returningToDesigner = isPreviewMode

              if (returningToDesigner && document.fullscreenElement) {
                await document.exitFullscreen()
              }

              setIsPreviewMode((current) => !current)
              setSelectedSlotId(null)
              setSelectedOccupiedSlotId(null)

              if (returningToDesigner) {
                requestAnimationFrame(() => {
                  document.querySelector('.binder-section')?.scrollIntoView({
                    behavior: 'instant',
                    block: 'start',
                  })
                })
              }
            }}

          >
            {isPreviewMode ? (
              <>
                <ArrowLeft size={17} strokeWidth={1.8} />
                Back to Designer
              </>
            ) : (
              <>
                <Eye size={17} strokeWidth={1.8} />
                Preview Binder
              </>
            )}
        </button>

        {isPreviewMode && (
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="binder-fullscreen-button"
          >
            <Maximize2 size={16} strokeWidth={1.8} />
            {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
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
          highlightedSlotId={highlightedBinderSlotId}
          ownedCardIds={ownedCardIds}
          onRenamePage={handleRenameBinderPage}
          />

          <div className="binder-navigation">
            <button
              type="button"
              onClick={() => {
                if (isMobile) {
                  setMobilePage((page) =>
                    page === 1 ? binderPages.length : page - 1
                )
                } else {
                  setCurrentSpread((spread) =>
                    spread === 0
                      ? Math.ceil(binderPages.length / 2)
                      : spread - 1
                  )
                }
              }}
          >
            {currentSpread === 0 ? '↺ Back' : '← Previous'}
          </button>


<div 
    className="binder-page-navigator"
    ref={pageNavigatorRef}
>
  <button
    type="button"
    className="binder-page-navigator-trigger"
    onClick={handleTogglePageNavigator}
    aria-expanded={isPageNavigatorOpen}
    aria-label="Choose binder pages"
  >
    <BookOpen size={18} strokeWidth={1.8} />

    <span className="binder-page-navigator-trigger-text">
      {isMobile
        ? `Page ${mobilePage}`
        : currentSpread === 0
          ? 'Front / Page 1'
          : currentSpread === Math.ceil(binderPages.length / 2)
            ? `Page ${binderPages.length} / Back`
            : `Pages ${currentSpread * 2}–${currentSpread * 2 + 1}`}
    </span>

    <ChevronDown
      size={17}
      className={isPageNavigatorOpen ? 'navigator-chevron-open' : ''}
    />
  </button>

  {isPageNavigatorOpen && (
    <div className="binder-page-navigator-menu">
      <div className="binder-page-navigator-heading">
        <BookOpen size={16} />
        <span>Choose Binder Pages</span>
      </div>

      {isMobile && (
        <div className="binder-page-navigator-search">
          <input
            type="text"
            placeholder="Search page number or name..."
            value={pageNavigatorSearch}
            onChange={(e) => setPageNavigatorSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Search binder pages"
          />
        </div>
      )}






      <div className="binder-page-navigator-options">
        {Array.from(
          { length: isMobile ? binderPages.length : Math.ceil(binderPages.length / 2) + 1 },
          (_, index) => index
        )
          .filter((index) => {
            if (!isMobile || !pageNavigatorSearch.trim()) return true

            const pageNumber = index + 1
            const page = binderPages[index]
            const search = pageNavigatorSearch.trim().toLowerCase()

            return (
              String(pageNumber).includes(search) ||
              (page?.name ?? '').toLowerCase().includes(search)
            )
          })
          .map((index) => {
            const spread = isMobile ? Math.floor((index + 1) / 2) : index
            const selectedPageNumber = index + 1
            const lastSpread = Math.ceil(binderPages.length / 2)

            const leftPageNumber = spread * 2
            const rightPageNumber = spread * 2 + 1

            const pageNumbers = isMobile
              ? [selectedPageNumber]
              : spread === 0
                ? [1]
                : spread === lastSpread
                  ? [binderPages.length]
                  : [leftPageNumber, rightPageNumber]

            const names = pageNumbers
              .map(
                (pageNumber) =>
                  binderPages.find(
                    (page) => page.pageNumber === pageNumber
                  )?.name
              )
              .filter((name): name is string => Boolean(name))

            const label = isMobile
              ? `Page ${selectedPageNumber}`
              : spread === 0
                ? 'Front / Page 1'
                : spread === lastSpread
                  ? `Page ${binderPages.length} / Back`
                  : `Pages ${leftPageNumber}–${rightPageNumber}`

            return (
              <button
                key={isMobile ? selectedPageNumber : spread}
                type="button"
                ref={
                  (isMobile
                    ? mobilePage === selectedPageNumber
                    : currentSpread === spread)
                    ? activePageOptionRef
                    : null
                }
                className={`binder-page-navigator-option ${
                  (isMobile
                    ? mobilePage === selectedPageNumber
                    : currentSpread === spread)
                    ? 'active'
                    : ''
                }`}
                onClick={() => {
                  if (isMobile) {
                    setMobilePage(selectedPageNumber)
                    } else {
                    setCurrentSpread(spread)
                  }

                  setPageNavigatorSearch('')
                  setIsPageNavigatorOpen(false)
                }}
              >
                
            <span className="binder-page-navigator-option-text">
              <span className="binder-page-navigator-option-title">
                {label}
              </span>

              {names.length > 0 && (
                <span className="binder-page-navigator-option-subtitle">
                  {names.join(' / ')}
                </span>
              )}
           </span>


                {(isMobile
                  ? mobilePage === selectedPageNumber
                  : currentSpread === spread) && (
                  <Check size={17} strokeWidth={2} />
                )}
              </button>
            )
          }
        )}
      </div>
    </div>
  )}
</div>


            <button
              type="button"
              onClick={() => {
  if (isMobile) {
    setMobilePage((page) =>
      page === binderPages.length ? 1 : page + 1
    )
  } else {
    setCurrentSpread((spread) =>
      spread === Math.ceil(binderPages.length / 2)
        ? 0
        : spread + 1
    )
  }
}}
            >
              {currentSpread === Math.ceil(binderPages.length / 2)
                ? 'Front ↻'
                : 'Next →'}
            </button>
          </div>

      </section>

    <section className="search-section">
      
    <form
      className="search-bar"
      onSubmit={(event) => {
        event.preventDefault()
        handleSearch()
      }}
    >
    <input
      type="text"
      placeholder="Search Pokémon cards..."
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
    />

  {(searchTerm || cards.length > 0) && (
    <button
      type="button"
      className="search-clear-button"
      onClick={handleClearSearch}
    >
      Clear
    </button>
  )}

  <button
    type="submit"
    disabled={!searchTerm.trim()}
  >
    Search
  </button>
</form>


      
    {cards.length > 0 && (
      <div className="main-search-results-toolbar">
        <p className="results-count">
          {cards.length} cards found
        </p>

        <div className="main-search-view-toggle">
          <button
            type="button"
            className={mainSearchView === 'grid' ? 'active' : ''}
            onClick={() => setMainSearchView('grid')}
            aria-pressed={mainSearchView === 'grid'}
          >
            ▦ Grid
          </button>

          <button
            type="button"
            className={mainSearchView === 'list' ? 'active' : ''}
            onClick={() => setMainSearchView('list')}
            aria-pressed={mainSearchView === 'list'}
          >
            ☰ List
          </button>
        </div>
      </div>
    )}


    </section>

   <section
      className={`card-grid ${
        mainSearchView === 'list' ? 'main-search-list-view' : ''
      }`}
    >
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
              displayMode={mainCollectionDisplay}
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

<footer className="app-footer">
  Made with love for my Kora
</footer>




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
        isOwned={ownedCardIds.has(
          `${selectedOccupiedSlot.card.cardId}-${selectedOccupiedSlot.card.variant.variantId}`
        )}
        onClose={() => setSelectedOccupiedSlotId(null)}
        onViewDetails={handleViewBinderCardDetails}
        onReplace={() => {
          setSelectedSlotId(selectedOccupiedSlotId)
          setSelectedOccupiedSlotId(null)
        }}
        onAddToCollection={handleAddBinderCardToCollection}
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
  onViewDetails={handleViewCollectionCardDetails}
  onManageQuantity={handleUpdateCollectionQuantity}
  onAddToBinder={() => {
    setSelectedCardToPlace(selectedManageCard)
    setSelectedManageCard(null)
  }}
  onRemove={handleRemoveFromCollection}
/>
)}

{selectedCardToPlace && (
  <CollectionBinderPlacement
    card={selectedCardToPlace}
    pages={binderPages}
    onClose={() => setSelectedCardToPlace(null)}
    onSelectPocket={handlePlaceCollectionCardInBinder}
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
              highlightBinderLocation(location)
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


{renamingPageNumber !== null && (
  <div
    className="rename-page-overlay"
    onClick={handleCancelBinderPageRename}
  >
    <div
      className="rename-page-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-page-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="rename-page-header">
        <div className="rename-page-heading">
          <span className="rename-page-icon">
            <Pencil size={20} strokeWidth={1.8} />
          </span>

          <div>
            <p className="rename-page-eyebrow">
              BINDER DESIGNER
            </p>
            <h3 id="rename-page-title">
              Rename Page {renamingPageNumber}
            </h3>
          </div>
        </div>

        <button
          type="button"
          className="rename-page-close"
          onClick={handleCancelBinderPageRename}
          aria-label="Close rename dialog"
        >
          <X size={19} />
        </button>
      </div>

      <p className="rename-page-description">
        Give this page a name to help organize your Pokémon collection.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          handleSaveBinderPageName()
        }}
      >
        <label
          className="rename-page-label"
          htmlFor="binder-page-name-input"
        >
          Page name
        </label>

        <input
          id="binder-page-name-input"
          className="rename-page-input"
          type="text"
          value={renamePageValue}
          onChange={(event) => setRenamePageValue(event.target.value)}
          maxLength={40}
          placeholder="e.g. Johto Favorites"
          autoFocus
        />

        <p className="rename-page-hint">
          {renamePageValue.length}/40 characters · Leave empty to clear the name
        </p>

        <div className="rename-page-actions">
          <button
            type="button"
            className="rename-page-cancel"
            onClick={handleCancelBinderPageRename}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rename-page-save"
          >
            <Check size={17} strokeWidth={2} />
            Save Name
          </button>
        </div>
      </form>
    </div>
  </div>
)}


{isRemoveCollectionConfirmOpen && selectedManageCard && (
  <div
    className="remove-collection-overlay"
    onClick={handleCancelRemoveFromCollection}
  >
    <div
      className="remove-collection-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="remove-collection-title"
      aria-describedby="remove-collection-description"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="remove-collection-header">
        <div className="remove-collection-icon">
          <Trash2 size={21} strokeWidth={1.8} />
        </div>

        <div className="remove-collection-heading">
          <span className="remove-collection-eyebrow">
            COLLECTION MANAGER
          </span>
          <h3 id="remove-collection-title">
            Remove from Collection?
          </h3>
        </div>

        <button
          type="button"
          className="remove-collection-close"
          onClick={handleCancelRemoveFromCollection}
          aria-label="Close confirmation"
        >
          <X size={18} />
        </button>
      </div>

      <p
        className="remove-collection-description"
        id="remove-collection-description"
      >
        Are you sure you want to remove
        <strong> {selectedManageCard.name}</strong> from your collection?
      </p>

      <div className="remove-collection-card-info">
        <img
          src={`${selectedManageCard.image}/high.webp`}
          alt={selectedManageCard.name}
        />

        <div>
          <strong>{selectedManageCard.name}</strong>
          <span>{selectedManageCard.set.name}</span>
          <span>Variant: {selectedManageCard.variant.type}</span>
          <span>Owned copies: {selectedManageCard.quantity}</span>
        </div>
      </div>

      <div className="remove-collection-notice">
        <Info size={17} strokeWidth={1.8} />
        <span>
          All owned copies of this entry will be removed.
          Cards already placed in your binder will stay there.
        </span>
      </div>

      <div className="remove-collection-actions">
        <button
          type="button"
          className="remove-collection-cancel"
          onClick={handleCancelRemoveFromCollection}
        >
          Cancel
        </button>

        <button
          type="button"
          className="remove-collection-confirm"
          onClick={handleConfirmRemoveFromCollection}
        >
          <Trash2 size={16} strokeWidth={1.8} />
          Remove Card
        </button>
      </div>
    </div>
  </div>
)}


  </main>
)
}

export default App