import { useState } from 'react'
import type {
  CardVariant,
  PokemonCardDetails,
} from '../types/PokemonCards'

interface CardDetailsModalProps {
  card: PokemonCardDetails
  onClose: () => void
  onAdd: (
    card: PokemonCardDetails,
    variant: CardVariant
  ) => void
}

function formatVariantName(type: string) {
  if (type === 'reverse') {
    return 'Reverse Holo'
  }

  if (type === 'holo') {
    return 'Holo'
  }

  if (type === 'normal') {
    return 'Normal'
  }

  return type
}

function CardDetailsModal({
  card,
  onClose,
  onAdd,
}: CardDetailsModalProps) {
  
    const variants = card.variants_detailed ?? []

  const [selectedVariant, setSelectedVariant] =
    useState<CardVariant | null>(variants[0] ?? null)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="card-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close card details"
        >
          ×
        </button>

        <div className="modal-card-image">
          {card.image && (
            <img
              src={`${card.image}/high.webp`}
              alt={card.name}
            />
          )}
        </div>

        <div className="modal-content">
          <p className="modal-eyebrow">
            {card.set?.name ?? 'Unknown Set'}
          </p>

          <h2>{card.name}</h2>

          <p className="modal-metadata">
            #{card.localId}
            {card.rarity && ` • ${card.rarity}`}
          </p>

          <div className="variant-section">
            <h3>Choose a variant</h3>

            <div className="variant-list">
              {variants.map((variant) => (
                <button
                  key={variant.variantId}
                  type="button"
                  className={
                    selectedVariant?.variantId === variant.variantId
                      ? 'variant-option selected'
                      : 'variant-option'
                  }
                  onClick={() => setSelectedVariant(variant)}
                >
                  <span>{formatVariantName(variant.type)}</span>

                  <span className="variant-size">
                    {variant.size}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="confirm-add-button"
            type="button"
            disabled={!selectedVariant}
            onClick={() => {
                if (selectedVariant) {
                    onAdd(card, selectedVariant)
                }
            }}
        >
          Add Card
        </button>

        </div>
      </section>
    </div>
  )
}

export default CardDetailsModal