import type { BinderPage as BinderPageType } from '../types/PokemonCards'
import BinderPage from './BinderPage'

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

}: BinderSpreadProps) {
  return (
    <div className="binder-spread">
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