
import type { BinderCard } from '../types/PokemonCards'

interface BinderCardActionsProps {
  card: BinderCard
  onClose: () => void
  onViewDetails: () => void
  onReplace: () => void
  onAddToCollection: () => void
  onRemove: () => void
}

function BinderCardActions({
  card,
  onClose,
  onViewDetails,
  onReplace,
  onAddToCollection,
  onRemove,
}: BinderCardActionsProps) {
  return (
    <div className="binder-actions-overlay" onClick={onClose}>
      <div
        className="binder-actions-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Actions for ${card.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="binder-actions-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="binder-actions-card">
          {card.image && (
            <img
              src={`${card.image}/high.webp`}
              alt={card.name}
            />
          )}

          <div>
            <h3>{card.name}</h3>
            <p>{card.set.name}</p>
            <p>{card.variant.type}</p>
          </div>
        </div>

        <div className="binder-actions-list">
          <button type="button" onClick={onViewDetails}>
            👁️ View Card Details
          </button>

          <button type="button" onClick={onReplace}>
            🔄 Replace Card
          </button>

          <button type="button" onClick={onAddToCollection}>
            📦 Add to My Collection
          </button>

          <button
            type="button"
            className="binder-actions-remove"
            onClick={onRemove}
          >
            🗑️ Remove from Binder
          </button>
        </div>
      </div>
    </div>
  )
}

export default BinderCardActions
