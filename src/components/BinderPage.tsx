import type { BinderPage as BinderPageType } from '../types/PokemonCards'

interface BinderPageProps {
  page: BinderPageType
  onSlotClick?: (slotId: string) => void
  onDragStart?: (slotId: string) => void
  onDrop?: (slotId: string) => void
}

function BinderPage({
     page,
    onSlotClick,
    onDragStart,
    onDrop,
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
            className="binder-pocket"
            type="button"
            key={slot.id}
            onClick={() => onSlotClick?.(slot.id)}
            draggable={Boolean(slot.card)}
            onDragStart={() => {
                if (slot.card) {
                    onDragStart?.(slot.id)
                }
            }}
            onDragOver={(event) => {
                event.preventDefault()
            }}

            onDrop={() => {
                onDrop?.(slot.id)
            }}
          >
            {slot.card ? (
              <img
                src={`${slot.card.image}/high.webp`}
                alt={slot.card.name}
              />
            ) : (
              <div className="empty-pocket">
                <span className="empty-pocket-plus">+</span>
                <span>Slot {index + 1}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="binder-page-number">
        Page {page.pageNumber}
      </p>
    </section>
  )
}

export default BinderPage