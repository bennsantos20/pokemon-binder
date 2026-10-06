import type { OwnedCard } from '../types/PokemonCards'

interface CollectionCardProps {
  card: OwnedCard
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

function CollectionCard({ card }: CollectionCardProps) {
  return (
    <article className="collection-card">
      <div className="collection-card-image">
        {card.image ? (
          <img
            src={`${card.image}/high.webp`}
            alt={card.name}
          />
        ) : (
          <div className="image-placeholder">
            <span>Image unavailable</span>
          </div>
        )}

        {card.quantity > 1 && (
          <span className="quantity-badge">
            ×{card.quantity}
          </span>
        )}
      </div>

      <div className="collection-card-info">
        <p className="collection-card-set">
          {card.set.name}
        </p>

        <h3>{card.name}</h3>

        <p className="collection-card-number">
          #{card.localId}
        </p>

        <span className="collection-variant">
          {formatVariantName(card.variant.type)}
        </span>
      </div>
    </article>
  )
}

export default CollectionCard