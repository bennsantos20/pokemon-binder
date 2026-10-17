import { useState } from 'react'
import type { OwnedCard } from '../types/PokemonCards'
import {
  Eye,
  SlidersHorizontal,
  Trash2,
  Minus,
  Plus,
  X,
  Check,
} from 'lucide-react'


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
            <Eye size={18} strokeWidth={1.8} />
            <span>View Card Details</span>
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
        <Minus size={16} strokeWidth={2} />
      </button>

      <strong>{quantity}</strong>

      <button
        type="button"
        onClick={() => setQuantity((current) => current + 1)}
      >
        <Plus size={16} strokeWidth={2} />
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
        <X size={16} strokeWidth={1.8} />
          <span>Cancel</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onManageQuantity(quantity)
          setIsEditingQuantity(false)
        }}
      >
        <Check size={16} strokeWidth={1.8} />
          <span>Save Quantity</span>
      </button>
    </div>
  </div>
) : (
    <button
      type="button"
      onClick={() => setIsEditingQuantity(true)}
      >
        <SlidersHorizontal size={18} strokeWidth={1.8} />
        <span>Manage Quantity</span>
      </button>
      )}

          <button
            type="button"
            className="collection-actions-remove"
            onClick={onRemove}
          >
            <Trash2 size={18} strokeWidth={1.8} />
            <span>Remove from Collection</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CollectionCardActions
