
import type { BinderCard } from '../types/PokemonCards'
import { Eye, RefreshCw, LibraryBig, Trash2 } from 'lucide-react'

interface BinderCardActionsProps {
  card: BinderCard
  isOwned: boolean
  onClose: () => void
  detailsLoading?: boolean
  detailsError?: string | null
  onViewDetails: () => void
  onReplace: () => void
  onAddToCollection: () => void
  onRemove: () => void
}

function BinderCardActions({
  card,
  isOwned,
  onClose,
  onViewDetails,
  detailsLoading = false,
  detailsError,
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

          <span
            className={`binder-actions-ownership ${
              isOwned
                ? 'binder-actions-ownership-owned'
                : 'binder-actions-ownership-unowned'
            }`}
          >
            {isOwned ? '✓ In My Collection' : 'ⓘ Not in My Collection'}
          </span>
        </div>
      </div>

        
        {detailsLoading && <p role="status">Loading card details… Close this menu to cancel.</p>}
        {detailsError && <p role="alert">{detailsError}</p>}
    <div className="binder-actions-list">
      <button type="button" onClick={onViewDetails} aria-busy={detailsLoading}>
        <Eye size={18} strokeWidth={1.8} />
        <span>View Card Details</span>
      </button>

      <button type="button" onClick={onReplace}>
        <RefreshCw size={18} strokeWidth={1.8} />
        <span>Replace Card</span>
      </button>

      <button type="button" onClick={onAddToCollection}>
        <LibraryBig size={18} strokeWidth={1.8} />
        <span>
          {isOwned ? 'Add Another Copy' : 'Add to My Collection'}
        </span>
      </button>

      <button
        type="button"
        className="binder-actions-remove"
        onClick={onRemove}
      >
        <Trash2 size={18} strokeWidth={1.8} />
        <span>Remove from Binder</span>
      </button>
    </div>



      </div>
    </div>
  )
}

export default BinderCardActions
