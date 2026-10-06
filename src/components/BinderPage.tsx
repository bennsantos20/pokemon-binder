import type { BinderPage as BinderPageType } from '../types/PokemonCards'

interface BinderPageProps {
  page: BinderPageType
}

function BinderPage({ page }: BinderPageProps) {
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