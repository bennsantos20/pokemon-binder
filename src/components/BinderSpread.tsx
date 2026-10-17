import type { BinderPage as BinderPageType } from '../types/PokemonCards'
import BinderPage from './BinderPage'
import { useRef } from 'react'

interface BinderSpreadProps {
  leftPage?: BinderPageType
  rightPage?: BinderPageType
  onSlotClick?: (slotId: string) => void
  onDragStart?: (slotId: string) => void
  onDrop?: (slotId: string) => void
  isPreviewMode?: boolean
  highlightedSlotId: string | null
  ownedCardIds: Set<string>
  onRenamePage?: (pageNumber: number) => void
  onSwipe?: (direction: 'left' | 'right') => void
}

function BinderSpread({
  leftPage,
  rightPage,
  onSlotClick,
  onDragStart,
  onDrop,
  isPreviewMode = false,
  highlightedSlotId,
  ownedCardIds,
  onRenamePage,
  onSwipe,

}: BinderSpreadProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current || !onSwipe) return

    const touch = event.changedTouches[0]

    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y

    touchStart.current = null

    // Ignore vertical scrolling and short movements
    if (Math.abs(deltaX) < 60) return
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return

    onSwipe(deltaX < 0 ? 'left' : 'right')
  }

  return (
    <div
      className="binder-spread"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="binder-spread-side binder-spread-left">
        {leftPage ? (
          <BinderPage
          page={leftPage}
          onSlotClick={onSlotClick}
          onDragStart={onDragStart}
          onDrop={onDrop}
          isPreviewMode={isPreviewMode}
          highlightedSlotId={highlightedSlotId}
          ownedCardIds={ownedCardIds}
          onRenamePage={onRenamePage}
        />
      ) : (
          <div className="binder-inside-cover">
            <p>Pokémon Binder</p>
          </div>
        )}
      </div>

      <div className="binder-spine" />

      <div className="binder-spread-side binder-spread-right">
        {rightPage ? (
          <BinderPage
          page={rightPage}
          onSlotClick={onSlotClick}
          onDragStart={onDragStart}
          onDrop={onDrop}
          isPreviewMode={isPreviewMode}
          highlightedSlotId={highlightedSlotId}
          ownedCardIds={ownedCardIds}
          onRenamePage={onRenamePage}
            />
        ) : (
          <div className="binder-inside-cover">
            <p>Pokémon Binder</p>
            </div>
        )}
      </div>
    </div>
  )
}

export default BinderSpread