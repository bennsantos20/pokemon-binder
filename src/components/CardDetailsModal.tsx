import { useState } from 'react'
import { resolveVariants, variantOptionLabel, VARIANTS_UNAVAILABLE_MESSAGE } from '../services/variants'
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

function CardDetailsModal({
  card,
  onClose,
  onAdd,
}: CardDetailsModalProps) {
  
    const { variants, unavailable, initialSelection } = resolveVariants(card.variants_detailed)

  const [selectedVariant, setSelectedVariant] =
    useState<CardVariant | null>(initialSelection)

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

            {unavailable && <>
              <p role="status">{VARIANTS_UNAVAILABLE_MESSAGE}</p>
              <p>Select Printing Unspecified to record this card without confirming its foil, stamp, or size. It stays separate from confirmed printings.</p>
            </>}
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
                  aria-pressed={selectedVariant?.variantId === variant.variantId}
                  onClick={() => setSelectedVariant(variant)}
                >
                  <span>{variantOptionLabel(variant, variants)}</span>
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