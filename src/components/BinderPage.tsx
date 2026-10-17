import type { BinderPage as BinderPageType } from '../types/PokemonCards'
import { useRef, useState } from 'react'
interface BinderPageProps {
  page: BinderPageType
  onSlotClick?: (slotId: string) => void
  onDragStart?: (slotId: string) => void
  onDrop?: (slotId: string) => void
  onTouchDragStart?: (slotId: string) => void
  onTouchDragEnd?: (slotId: string) => void
  isPreviewMode?: boolean
  isRearrangeMode?: boolean
  highlightedSlotId: string | null
  ownedCardIds: Set<string>
  onRenamePage?: (pageNumber: number) => void
  onTouchCardDrop?: (sourceSlotId: string, targetSlotId: string) => void
}

function BinderPage({
     page,
    onSlotClick,
    onDragStart,
    onDrop,
    onTouchDragStart,
    onTouchDragEnd,
    isPreviewMode = false,
    isRearrangeMode = false,
    highlightedSlotId,
    ownedCardIds,
    onRenamePage,
    onTouchCardDrop,
}: BinderPageProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTouchDragging = useRef(false)
  const touchSourceSlotId = useRef<string | null>(null)
  const [floatingCard, setFloatingCard] = useState<{
  image: string
  x: number
  y: number
} | null>(null)

  const touchStartPosition = useRef<{ x: number; y: number } | null>(null)

const cancelLongPress = () => {
  if (longPressTimer.current !== null) {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  touchStartPosition.current = null
}

const finishTouchDrag = (
  event: React.TouchEvent<HTMLButtonElement>
) => {
  if (isTouchDragging.current) {
    const touch = event.changedTouches[0]

    if (touch) {
      const element = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      )

      const targetPocket = element?.closest(
        '[data-binder-slot-id]'
      )

      const targetSlotId = targetPocket?.getAttribute(
        'data-binder-slot-id'
      )

      console.log('Dropped over pocket:', targetSlotId)
      if (touchSourceSlotId.current && targetSlotId) {
        onTouchCardDrop?.(touchSourceSlotId.current, targetSlotId)
      }
    }
  }

  isTouchDragging.current = false
  touchSourceSlotId.current = null
  setFloatingCard(null)
  cancelLongPress()
}

const startLongPress = (
  event: React.TouchEvent<HTMLButtonElement>,
  slotId: string,
  hasCard: boolean
) => {
  if (!isRearrangeMode || isPreviewMode || !hasCard || event.touches.length !== 1) return

  cancelLongPress()

  const touch = event.touches[0]

  touchStartPosition.current = {
    x: touch.clientX,
    y: touch.clientY,
  }

  const cardImage = page.slots.find(
    (slot) => slot.id === slotId
  )?.card?.image

  const cardImageUrl = cardImage ? `${cardImage}/high.webp` : null

isTouchDragging.current = true
touchSourceSlotId.current = slotId

if (cardImageUrl) {
  setFloatingCard({
    image: cardImageUrl,
    x: touch.clientX,
    y: touch.clientY,
  })
}

console.log('Touch drag activated:', slotId)
}


const moveLongPress = (event: React.TouchEvent<HTMLButtonElement>) => {
  if (!touchStartPosition.current || event.touches.length !== 1) {
    cancelLongPress()
    return
  }

  const touch = event.touches[0]
  if (isTouchDragging.current) {
  setFloatingCard((current) =>
    current
      ? {
          ...current,
          x: touch.clientX,
          y: touch.clientY,
        }
      : null
  )
}
  const deltaX = touch.clientX - touchStartPosition.current.x
  const deltaY = touch.clientY - touchStartPosition.current.y

  if (!isTouchDragging.current && Math.hypot(deltaX, deltaY) > 12) {
    cancelLongPress()
  }
}

  return (
    <section className="binder-page">
      <div
        className="binder-pocket-grid"
        style={{
          gridTemplateColumns: `repeat(${page.columns}, 1fr)`,
          gridTemplateRows: `repeat(${page.rows}, 1fr)`,
        }}
      >
        {page.slots.map((slot, index) => (
          <button
            className={`binder-pocket ${
              !isPreviewMode && highlightedSlotId === slot.id
                ? 'binder-pocket-highlighted'
                : ''
            } ${
             !isPreviewMode &&
              slot.card &&
              !ownedCardIds.has(
                `${slot.card.cardId}-${slot.card.variant.variantId}`
              )
                ? 'binder-pocket-unowned'
                : ''
            }`}
            type="button"
            key={slot.id}
            data-binder-slot-id={slot.id}
            onClick={() => {
                if (!isPreviewMode) {
                    onSlotClick?.(slot.id)
                }
            }}
          onTouchStart={(event) => {
            startLongPress(event, slot.id, Boolean(slot.card))
          }}
          onTouchMove={moveLongPress}
          onTouchEnd={(event) => {
            finishTouchDrag(event)
          }}


          onTouchCancel={() => {
            isTouchDragging.current = false
            setFloatingCard(null)
            touchSourceSlotId.current = null
            cancelLongPress()
          }}


            onContextMenu={(event) => {
              if (event.nativeEvent instanceof MouseEvent && event.nativeEvent.button === 2) {
                return
              }

              event.preventDefault()
            }}


            draggable={Boolean(slot.card) && !isPreviewMode}
            onDragStart={() => {
                if (slot.card && !isPreviewMode) {
                    onDragStart?.(slot.id)
                }
            }}
            onDragOver={(event) => {
                if (!isPreviewMode) {
                    event.preventDefault()
                }
            }}
            onDrop={() => {
                if (!isPreviewMode) {
                    onDrop?.(slot.id)
                }
                }}
          >
            {slot.card ? (
              <img
                src={`${slot.card.image}/high.webp`}
                alt={slot.card.name}
              />
            ) : (
                <div className="empty-pocket">
                    {!isPreviewMode && (
                        <>
                            <span className="empty-pocket-plus">+</span>
                            <span>Slot {index + 1}</span>
                        </>
                    )}
                </div>
            )}
          </button>
        ))}
      </div>

      

<div className="binder-page-footer">
  {!isPreviewMode && onRenamePage ? (
    <button
      type="button"
      className="binder-page-label-button"
      onClick={() => onRenamePage(page.pageNumber)}
      aria-label={`Rename Page ${page.pageNumber}${
        page.name ? `, ${page.name}` : ''
      }`}
      title="Click to rename page"
    >
      <span className="binder-page-number">
        Page {page.pageNumber}
      </span>

      {page.name && (
        <span className="binder-page-custom-name">
          {page.name}
        </span>
      )}
    </button>
  ) : (
    <div className="binder-page-label">
      <span className="binder-page-number">
        Page {page.pageNumber}
      </span>

      {page.name && (
        <span className="binder-page-custom-name">
          {page.name}
        </span>
      )}
    </div>
  )}
</div>


    

    {floatingCard && (
      <img
        src={floatingCard.image}
        alt="Dragging Pokémon card"
        className="binder-floating-card"
        style={{
          left: floatingCard.x,
          top: floatingCard.y,
        }}
        draggable={false}
      />
    )}

  </section>
  )
}



export default BinderPage