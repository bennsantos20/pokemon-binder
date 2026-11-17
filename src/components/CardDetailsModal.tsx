import CardImage from './CardImage'
import { useModalFocus } from '../hooks/useModalFocus'
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

  const modalRef = useModalFocus(onClose)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="card-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Card details for ${card.name}`}
        tabIndex={-1}
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
          <CardImage cardId={card.id} name={card.name} image={card.image} />
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

          {!card.set && <p role="status">Set information is unavailable. Please reopen this card to try again before adding or placing it.</p>}
          <button
            className="confirm-add-button"
            type="button"
            disabled={!selectedVariant || !card.set}
            onClick={() => {
                if (selectedVariant && card.set) {
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