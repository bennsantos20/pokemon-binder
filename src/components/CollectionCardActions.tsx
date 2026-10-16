import { useState } from 'react'
import type { OwnedCard } from '../types/PokemonCards'


interface CollectionCardActionsProps {
  card: OwnedCard
  onClose: () => void
  onViewDetails: () => void
  onManageQuantity: (quantity: number) => void
  onRemove: () => void
}

function CollectionCardActions({
  card,
  onClose,
  onViewDetails,
  onManageQuantity,
  onRemove,
}: CollectionCardActionsProps) {
    const [isEditingQuantity, setIsEditingQuantity] = useState(false)
    const [quantity, setQuantity] = useState(card.quantity)

  return (
    <div
      className="collection-actions-overlay"
      onClick={onClose}
    >
      <div
        className="collection-actions-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Manage ${card.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="collection-actions-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="collection-actions-card">
          {card.image && (
            <img
              src={`${card.image}/high.webp`}
              alt={card.name}
            />
          )}

          <div>
            <p className="eyebrow">COLLECTION MANAGER</p>
            <h3>{card.name}</h3>
            <p>{card.set.name}</p>
            <p>{card.variant.type}</p>
            <p>Quantity: {card.quantity}</p>
          </div>
        </div>

        <div className="collection-actions-list">
          <button type="button" onClick={onViewDetails}>
            👁️ View Card Details
          </button>

          {isEditingQuantity ? (
  <div className="collection-quantity-editor">
    <p>How many copies do you own?</p>

    <div className="collection-quantity-controls">
      <button
        type="button"
        disabled={quantity <= 1}
        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
      >
        −
      </button>

      <strong>{quantity}</strong>

      <button
        type="button"
        onClick={() => setQuantity((current) => current + 1)}
      >
        +
      </button>
    </div>

    <div className="collection-quantity-actions">
      <button
        type="button"
        onClick={() => {
          setQuantity(card.quantity)
          setIsEditingQuantity(false)
        }}
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={() => {
          onManageQuantity(quantity)
          setIsEditingQuantity(false)
        }}
      >
        Save Quantity
      </button>
    </div>
  </div>
) : (
  <button
    type="button"
    onClick={() => setIsEditingQuantity(true)}
  >
    ➕➖ Manage Quantity
  </button>
)}

          <button
            type="button"
            className="collection-actions-remove"
            onClick={onRemove}
          >
            🗑️ Remove from Collection
          </button>
        </div>
      </div>
    </div>
  )
}

export default CollectionCardActions
