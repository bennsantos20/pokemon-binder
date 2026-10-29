import type { BinderPage as BinderPageType } from '../types/PokemonCards'
import BinderPage from './BinderPage'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

interface BinderSpreadProps {
  leftPage?: BinderPageType
  rightPage?: BinderPageType
  onSlotClick?: (slotId: string) => void
  onDragStart?: (slotId: string) => void
  onDrop?: (slotId: string) => void
  onTouchCardDrop?: (sourceSlotId: string, targetSlotId: string) => void
  isPreviewMode?: boolean
  isRearrangeMode?: boolean
  highlightedSlotId: string | null
  ownedCardIds: Set<string>
  onRenamePage?: (pageNumber: number) => void
  isMobile?: boolean
  canDragPrevious?: boolean
  canDragNext?: boolean
  onDragPageTurn?: (direction: 'left' | 'right') => void
  onSwipe?: (direction: 'left' | 'right') => void
}

function BinderSpread({
  leftPage,
  rightPage,
  onSlotClick,
  onDragStart,
  onDrop,
  onTouchCardDrop,
  isPreviewMode = false,
  isRearrangeMode = false,
  highlightedSlotId,
  ownedCardIds,
  onRenamePage,
  onSwipe,
  isMobile = false,
  canDragPrevious = false,
  canDragNext = false,
  onDragPageTurn,

}: BinderSpreadProps) {
  const spreadRef = useRef<HTMLDivElement>(null)
  const activeDrag = useRef<{ slotId: string; pointerId: number } | null>(null)
  const suppressClick = useRef(false)
  const [edgeDirection, setEdgeDirection] = useState<'left' | 'right' | null>(null)
  const [floatingCard, setFloatingCard] = useState<{
    image?: string
    x: number
    y: number
  } | null>(null)

  const cancelDrag = () => {
    const drag = activeDrag.current
    activeDrag.current = null
    setFloatingCard(null)
    setEdgeDirection(null)
    if (drag && spreadRef.current?.hasPointerCapture(drag.pointerId)) {
      spreadRef.current.releasePointerCapture(drag.pointerId)
    }
  }

  const startTouchDrag = (
    event: PointerEvent<HTMLButtonElement>, slotId: string, image?: string
  ) => {
    if (activeDrag.current || !event.isPrimary) return
    event.preventDefault()
    spreadRef.current?.setPointerCapture(event.pointerId)
    activeDrag.current = { slotId, pointerId: event.pointerId }
    suppressClick.current = true
    touchStart.current = null
    setFloatingCard({ image, x: event.clientX, y: event.clientY })
    updateEdgeDirection(event.clientX, event.clientY)
  }

  // Changing modes or unmounting ends the captured gesture.
  useEffect(() => () => cancelDrag(), [isRearrangeMode, isPreviewMode, isMobile])

  const updateEdgeDirection = (x: number, y: number) => {
    const bounds = spreadRef.current?.getBoundingClientRect()
    if (!isMobile || !bounds || y < bounds.top || y > bounds.bottom) {
      setEdgeDirection(null)
      return
    }
    const left = Math.max(0, bounds.left)
    const right = Math.min(window.innerWidth, bounds.right)
    const edgeWidth = Math.min(40, (right - left) / 4)
    setEdgeDirection(x >= left && x <= left + edgeWidth
      ? 'left'
      : x <= right && x >= right - edgeWidth
        ? 'right'
        : null)
  }

  useEffect(() => {
    if (!edgeDirection || (edgeDirection === 'left' ? !canDragPrevious : !canDragNext)) return
    const timer = window.setTimeout(() => {
      if (activeDrag.current) onDragPageTurn?.(edgeDirection)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [edgeDirection, canDragPrevious, canDragNext, onDragPageTurn, rightPage])

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (activeDrag.current || isRearrangeMode) return
    const touch = event.touches[0]

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (activeDrag.current || isRearrangeMode || !touchStart.current || !onSwipe) return

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
      ref={spreadRef}
      className="binder-spread"
      onPointerDownCapture={() => { suppressClick.current = false }}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = false
        }
      }}
      onPointerMove={(event) => {
        if (activeDrag.current?.pointerId !== event.pointerId) return
        event.preventDefault()
        updateEdgeDirection(event.clientX, event.clientY)
        setFloatingCard((current) => current && ({ ...current, x: event.clientX, y: event.clientY }))
      }}
      onPointerUp={(event) => {
        const drag = activeDrag.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const target = document.elementFromPoint(event.clientX, event.clientY)
          ?.closest('[data-binder-slot-id]')
        const targetSlotId = target?.getAttribute('data-binder-slot-id')
        cancelDrag()
        if (targetSlotId && target && spreadRef.current?.contains(target)) {
          onTouchCardDrop?.(drag.slotId, targetSlotId)
        }
      }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
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
          onTouchCardStart={startTouchDrag}
          isPreviewMode={isPreviewMode}
          isRearrangeMode={isRearrangeMode}
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

      {floatingCard?.image && (
        <img
          src={`${floatingCard.image}/high.webp`}
          alt="Dragging Pokémon card"
          className="binder-floating-card"
          style={{ left: floatingCard.x, top: floatingCard.y }}
          draggable={false}
        />
      )}

      <div className="binder-spine" />

      <div className="binder-spread-side binder-spread-right">
        {rightPage ? (
          <BinderPage
          page={rightPage}
          onSlotClick={onSlotClick}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onTouchCardStart={startTouchDrag}
          isPreviewMode={isPreviewMode}
          isRearrangeMode={isRearrangeMode}
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
