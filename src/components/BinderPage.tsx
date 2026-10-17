import type { BinderPage as BinderPageType } from '../types/PokemonCards'
interface BinderPageProps {
  page: BinderPageType
  onSlotClick?: (slotId: string) => void
  onDragStart?: (slotId: string) => void
  onDrop?: (slotId: string) => void
  isPreviewMode?: boolean
  highlightedSlotId: string | null
  ownedCardIds: Set<string>
  onRenamePage?: (pageNumber: number) => void
}

function BinderPage({
     page,
    onSlotClick,
    onDragStart,
    onDrop,
    isPreviewMode = false,
    highlightedSlotId,
    ownedCardIds,
    onRenamePage,
}: BinderPageProps) {

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
            onClick={() => {
                if (!isPreviewMode) {
                    onSlotClick?.(slot.id)
                }
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


    </section>
  )
}

export default BinderPage