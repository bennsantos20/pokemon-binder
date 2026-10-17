import type { OwnedCard } from '../types/PokemonCards'

interface CollectionCardProps {
  card: OwnedCard
  displayMode: 'grid' | 'list'
  onManage: (card: OwnedCard) => void
  binderPlacements: {
    pageNumber: number
    slotNumber: number
  }[]
  onBinderClick: (
    placements: { pageNumber: number; slotNumber: number }[]
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

function CollectionCard({
  card,
  displayMode,
  onManage,
  binderPlacements,
  onBinderClick,
}: CollectionCardProps) {
  return (
    <article className="collection-card">
      <div className="collection-card-image">
        {displayMode === 'grid' && (
          <button
            type="button"
            className="collection-card-image-action"
            onClick={() => onManage(card)}
            aria-label={`Manage ${card.name} from ${card.set.name}`}
            title={`Manage ${card.name}`}
         />
        )}
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

        
      </div>

      <div className="collection-card-info">
        <p className="collection-card-set">
          {card.set.name}
        </p>

        <div className="collection-card-name-row">
          <h3>{card.name}</h3>

          {card.quantity > 1 && (
            <span className="collection-card-owned-badge">
              ×{card.quantity} owned
            </span>
          )}
        </div>

        <p className="collection-card-number">
          #{card.localId}
        </p>

<span className="collection-variant">
  {formatVariantName(card.variant.type)}
</span>

<p className="collection-card-quantity-text">
  {card.quantity} {card.quantity === 1 ? 'copy' : 'copies'} owned
</p>

{binderPlacements.length > 0 && (
  <button
    type="button"
    className="collection-binder-indicator"
    onClick={() => onBinderClick(binderPlacements)}
    title="View card in binder"
  >
    <span className="collection-binder-indicator-icon">
      📖
    </span>

    <span className="collection-binder-indicator-text">
      {binderPlacements.length === 1
        ? `In Binder · Page ${binderPlacements[0].pageNumber}`
        : `In Binder · ${binderPlacements.length} locations`}
    </span>
  </button>
)}

</div>

{displayMode === 'list' && (
  <button
    type="button"
    className="collection-manage-button"
    onClick={() => onManage(card)}
    aria-label={`Manage ${card.name} from ${card.set.name}`}
    title="Manage Card"
  >
    ...
  </button>
)}
</article>



  )
}

export default CollectionCard