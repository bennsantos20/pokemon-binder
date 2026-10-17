
import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'
import type { BinderPage, OwnedCard } from '../types/PokemonCards'

interface CollectionBinderPlacementProps {
  card: OwnedCard
  pages: BinderPage[]
  onClose: () => void
  onSelectPocket: (pageNumber: number, slotId: string) => void
}

function CollectionBinderPlacement({
  card,
  pages,
  onClose,
  onSelectPocket,
}: CollectionBinderPlacementProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false)
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState(false)
  const [pageSearch, setPageSearch] = useState('')
    const pageMenuRef = useRef<HTMLDivElement>(null)
    const pageSearchRef = useRef<HTMLInputElement>(null)

function goToPage(index: number) {
  setPageIndex(index)
  setSelectedSlotId(null)
  setIsReplaceConfirmOpen(false)
  setIsPageMenuOpen(false)
  setPageSearch('')
}

const filteredPages = pages
  .map((binderPage, index) => ({ binderPage, index }))
  .filter(({ binderPage }) => {
    const search = pageSearch.trim().toLowerCase()

    return (
      `page ${binderPage.pageNumber}`.includes(search) ||
      String(binderPage.pageNumber).includes(search) ||
      (binderPage.name ?? '').toLowerCase().includes(search)
    )
  })

useEffect(() => {
  if (!isPageMenuOpen) return

  function handlePointerDown(event: PointerEvent) {
    if (
      pageMenuRef.current &&
      !pageMenuRef.current.contains(event.target as Node)
    ) {
      setIsPageMenuOpen(false)
      setPageSearch('')
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setIsPageMenuOpen(false)
      setPageSearch('')
    }
  }

  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeyDown)

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('keydown', handleKeyDown)
  }
}, [isPageMenuOpen])

useEffect(() => {
  if (isPageMenuOpen) {
    pageSearchRef.current?.focus()
  }
}, [isPageMenuOpen])

  const page = pages[pageIndex]

  if (!page) return null

  const selectedSlot = page.slots.find(
    (slot) => slot.id === selectedSlotId
  )

function changePage(direction: number) {
  setPageIndex((current) =>
    Math.max(0, Math.min(pages.length - 1, current + direction))
  )

  setSelectedSlotId(null)
  setIsPageMenuOpen(false)
  setPageSearch('')
}

  return (
    <div
      className="collection-placement-overlay"
      onClick={onClose}
    >
      <div
        className="collection-placement-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Place ${card.name} in binder`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="collection-placement-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <p className="eyebrow">BINDER DESIGNER</p>
        <h2>Add to Binder</h2>

        <p className="collection-placement-description">
          Choose where to place {card.name}.
        </p>

        <div className="collection-placement-navigation">
          <button
            type="button"
            onClick={() => changePage(-1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeft size={18} />
          </button>

          <div
            className="collection-placement-page-picker"
            ref={pageMenuRef}
            >
            <button
                type="button"
                className={`collection-placement-page-trigger ${
                isPageMenuOpen ? 'open' : ''
                }`}
                aria-expanded={isPageMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setIsPageMenuOpen((current) => !current)}
            >
                <span className="collection-placement-page-trigger-label">
                Page {page.pageNumber}
                {page.name && (
                    <span className="collection-placement-page-trigger-name">
                    {page.name}
                    </span>
                )}
                </span>

                <ChevronDown
                size={17}
                className={isPageMenuOpen ? 'rotated' : ''}
                />
            </button>

            {isPageMenuOpen && (
                <div className="collection-placement-page-menu">
                <div className="collection-placement-page-search">
                    <Search size={16} />
                    <input
                    ref={pageSearchRef}
                    type="text"
                    value={pageSearch}
                    onChange={(event) => setPageSearch(event.target.value)}
                    placeholder="Search pages or names..."
                    aria-label="Search binder pages"
                    />
                </div>

                <div className="collection-placement-page-options">
                    {filteredPages.map(({ binderPage, index }) => (
                    <button
                        key={binderPage.id}
                        type="button"
                        className={`collection-placement-page-option ${
                        pageIndex === index ? 'active' : ''
                        }`}
                        onClick={() => goToPage(index)}
                    >
                    <span className="collection-placement-page-option-number">
                        {binderPage.pageNumber}
                    </span>

                    <span className="collection-placement-page-option-info">
                        <strong>Page {binderPage.pageNumber}</strong>
                        {binderPage.name && <small>{binderPage.name}</small>}
                    </span>

                    {pageIndex === index && <Check size={17} />}
                </button>
                ))}

        {filteredPages.length === 0 && (
          <p className="collection-placement-page-empty">
            No matching pages found.
          </p>
        )}
      </div>
    </div>
  )}
</div>

          <button
            type="button"
            onClick={() => changePage(1)}
            disabled={pageIndex === pages.length - 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="collection-placement-grid">
          {page.slots.map((slot, index) => (
            <button
              key={slot.id}
              type="button"
              className={`collection-placement-pocket ${
                selectedSlotId === slot.id ? 'selected' : ''
              }`}
              onClick={() => {
                setSelectedSlotId(slot.id)
                setIsReplaceConfirmOpen(false)
              }}
              title={
                slot.card
                  ? `Pocket ${index + 1}: ${slot.card.name}`
                  : `Pocket ${index + 1}: Empty`
              }
            >
              {slot.card?.image ? (
                <img
                  src={`${slot.card.image}/high.webp`}
                  alt={slot.card.name}
                />
              ) : (
                <span className="collection-placement-empty">
                  {slot.card ? slot.card.name : '+'}
                </span>
              )}

              <span className="collection-placement-pocket-number">
                {index + 1}
              </span>
            </button>
          ))}
        </div>

          {isReplaceConfirmOpen && selectedSlot?.card && (
            <div className="collection-placement-confirm">
              <h3>Replace this card?</h3>

              <p>
                You're about to replace{' '}
                <strong>{selectedSlot.card.name}</strong> with{' '}
                <strong>{card.name}</strong> on Page {page.pageNumber}.
              </p>

              <p>
                The original card will be removed from this binder pocket,
                but your collection inventory will not be affected.
              </p>

              <div className="collection-placement-confirm-actions">
                <button
                  type="button"
                  onClick={() => setIsReplaceConfirmOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectPocket(page.pageNumber, selectedSlot.id)
                  }}
                >
                  Confirm Replacement
                </button>
              </div>
            </div>
          )}

        <div className="collection-placement-footer">
          {selectedSlot ? (
            <>
              <p>
                {selectedSlot.card
                  ? `Occupied by ${selectedSlot.card.name}`
                  : 'Empty pocket'}
              </p>

              <button
                type="button"
                disabled={isReplaceConfirmOpen}
                onClick={() => {
                  if (selectedSlot.card) {
                    setIsReplaceConfirmOpen(true)
                  } else {
                    onSelectPocket(page.pageNumber, selectedSlot.id)
                  }
                }}
              >
                {selectedSlot.card
                  ? 'Replace Card'
                  : 'Place Card Here'}
              </button>
            </>
          ) : (
            <p>Select a pocket to continue.</p>
          )}
        </div>
      </div>

          

    </div>
  )
}

export default CollectionBinderPlacement
