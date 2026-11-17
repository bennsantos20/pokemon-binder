import CardImage from './CardImage'
import AccessibleDialog from './AccessibleDialog'
import { useModalFocus } from '../hooks/useModalFocus'

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react'
import type { BinderCard, BinderPage } from '../types/PokemonCards'

interface CollectionBinderPlacementProps {
  card: BinderCard
  pages: BinderPage[]
  onClose: () => void
  onSelectPocket: (pageNumber: number, slotId: string, expectedTarget?: BinderCard | null) => void | string
  moveSourceSlotId?: string
}

function CollectionBinderPlacement({
  card,
  pages,
  onClose,
  onSelectPocket,
  moveSourceSlotId,
}: CollectionBinderPlacementProps) {
  const [pageIndex, setPageIndex] = useState(Math.max(0, pages.findIndex(page => page.slots.some(slot => slot.id === moveSourceSlotId))))
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false)
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState(false)
  const [pageSearch, setPageSearch] = useState('')
  const [moveDestination, setMoveDestination] = useState<{
    pageNumber: number; slotId: string; pocketNumber: number; card: BinderCard | null
  } | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const isMoving = moveSourceSlotId !== undefined
  const sourcePage = pages.find(page => page.slots.some(slot => slot.id === moveSourceSlotId))
  const sourcePocketNumber = sourcePage ? sourcePage.slots.findIndex(slot => slot.id === moveSourceSlotId) + 1 : null
  const sourceLocation = sourcePage ? `Page ${sourcePage.pageNumber}, pocket ${sourcePocketNumber}` : 'the original pocket'

    const pageMenuRef = useRef<HTMLDivElement>(null)
    const pageSearchRef = useRef<HTMLInputElement>(null)
    const pageTriggerRef = useRef<HTMLButtonElement>(null)
  const modalRef = useModalFocus(() => {
    if (isPageMenuOpen) {
      setIsPageMenuOpen(false)
      setPageSearch('')
      pageTriggerRef.current?.focus()
    } else onClose()
  })

function goToPage(index: number) {
  pageTriggerRef.current?.focus()
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
  if (moveDestination) {
    modalRef.current?.querySelector('[aria-describedby="binder-move-description"]')?.scrollIntoView({
      block: 'nearest', behavior: 'instant',
    })
  }
}, [moveDestination, modalRef])

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

  document.addEventListener('pointerdown', handlePointerDown)

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown)
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
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={isMoving ? `Move or swap ${card.name}` : `Place ${card.name} in binder`}
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
        <h2>{isMoving ? 'Move / Swap Card' : 'Add to Binder'}</h2>

        <p className="collection-placement-description">
          {isMoving
            ? `Choose a destination for ${card.name} (${card.variant.type}) from ${sourceLocation}. Empty pockets move the card; occupied pockets swap both cards.`
            : `Choose where to place ${card.name}.`}
        </p>

        <div className="collection-placement-navigation">
          <button
            type="button"
            aria-label="Previous binder page"
            onClick={() => changePage(-1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

          <div
            className="collection-placement-page-picker"
            ref={pageMenuRef}
            >
            <button
                type="button"
                ref={pageTriggerRef}
                className={`collection-placement-page-trigger ${
                isPageMenuOpen ? 'open' : ''
                }`}
                aria-expanded={isPageMenuOpen}
                aria-controls="collection-placement-page-menu"
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
                <div id="collection-placement-page-menu" className="collection-placement-page-menu">
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
                        aria-current={pageIndex === index ? 'page' : undefined}
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
            aria-label="Next binder page"
            onClick={() => changePage(1)}
            disabled={pageIndex === pages.length - 1}
          >
            <ChevronRight size={18} aria-hidden="true" />
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
              disabled={slot.id === moveSourceSlotId}
              aria-pressed={selectedSlotId === slot.id}
              aria-label={`Page ${page.pageNumber}, pocket ${index + 1}: ${slot.card
                ? `Occupied by ${slot.card.name} (${slot.card.variant.type})` : 'Empty'}${slot.id === moveSourceSlotId ? ', original pocket, unavailable as destination' : ''}`}
              onClick={() => {
                if (slot.id === moveSourceSlotId) return
                setSelectedSlotId(slot.id)
                setIsReplaceConfirmOpen(false)
              }}
              title={
                slot.card
                  ? `Pocket ${index + 1}: ${slot.card.name}`
                  : `Pocket ${index + 1}: Empty`
              }
            >
              {slot.card ? (
                <CardImage cardId={slot.card.id} name={slot.card.name} image={slot.card.image} decorative />
              ) : (
                <span className="collection-placement-empty">
                  +
                </span>
              )}

              <span className="collection-placement-pocket-number">
                {index + 1}{slot.id === moveSourceSlotId && ' · Source'}
              </span>
            </button>
          ))}
        </div>

          {isReplaceConfirmOpen && selectedSlot?.card && (
            <AccessibleDialog
              className="collection-placement-confirm"
              role="alertdialog"
              aria-label="Replace this card?"
              aria-describedby="collection-placement-confirm-description"
              onClose={() => setIsReplaceConfirmOpen(false)}
            >
              <h3>Replace this card?</h3>

              <p id="collection-placement-confirm-description">
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
            </AccessibleDialog>
          )}

          {moveDestination && (
            <AccessibleDialog
              className="collection-placement-confirm"
              role="alertdialog"
              aria-label={moveDestination.card ? 'Swap these cards?' : 'Move this card?'}
              aria-describedby="binder-move-description"
              onClose={() => setMoveDestination(null)}
            >
              <h3>{moveDestination.card ? 'Swap these cards?' : 'Move this card?'}</h3>
              <p id="binder-move-description">
                {moveDestination.card
                  ? `Swap ${card.name} (${card.set.name}, ${card.variant.type}) on ${sourceLocation} with ${moveDestination.card.name} (${moveDestination.card.set.name}, ${moveDestination.card.variant.type}) on Page ${moveDestination.pageNumber}, pocket ${moveDestination.pocketNumber}.`
                  : `Move ${card.name} (${card.set.name}, ${card.variant.type}) from ${sourceLocation} to the empty pocket on Page ${moveDestination.pageNumber}, pocket ${moveDestination.pocketNumber}. The source pocket will become empty.`}
              </p>
              <p>Only binder placements change. Collection quantities stay the same.</p>
              {moveError && <p role="alert">{moveError}</p>}
              <div className="collection-placement-confirm-actions">
                <button type="button" onClick={() => setMoveDestination(null)}>Cancel</button>
                <button type="button" onClick={() => {
                  const error = onSelectPocket(moveDestination.pageNumber, moveDestination.slotId, moveDestination.card)
                  if (typeof error === 'string') setMoveError(error)
                }}>
                  {moveDestination.card ? 'Confirm Swap' : 'Confirm Move'}
                </button>
              </div>
            </AccessibleDialog>
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
                disabled={isReplaceConfirmOpen || moveDestination !== null}
                onClick={() => {
                  if (isMoving) {
                    if (selectedSlot.id === moveSourceSlotId) return
                    setMoveError(null)
                    setMoveDestination({ pageNumber: page.pageNumber, slotId: selectedSlot.id,
                      pocketNumber: page.slots.indexOf(selectedSlot) + 1, card: selectedSlot.card })
                  } else if (selectedSlot.card) {
                    setIsReplaceConfirmOpen(true)
                  } else {
                    onSelectPocket(page.pageNumber, selectedSlot.id)
                  }
                }}
              >
                {isMoving
                  ? selectedSlot.card ? 'Review Swap' : 'Review Move'
                  : selectedSlot.card ? 'Replace Card' : 'Place Card Here'}
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
