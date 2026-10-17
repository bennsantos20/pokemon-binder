import type { PokemonCard } from '../types/PokemonCards'

interface CardSearchResultProps {
  card: PokemonCard
  onAdd: (card: PokemonCard) => void
}

function CardSearchResult({
    card,
    onAdd,
}: CardSearchResultProps) {
  return (
    <article className="card-result">
      <div className="card-image-container">
        {card.image ? (
          <img
            className="card-image"
            src={`${card.image}/high.webp`}
            alt={card.name}
          />
        ) : (
          <div className="image-placeholder">
            <span>Image unavailable</span>
          </div>
        )}
      </div>

      <div className="card-info">
        <div>
          <h2>{card.name}</h2>
          <p>Card #{card.localId}</p>
        </div>

       <button
        className="add-button"
        type="button"
        aria-label={`View ${card.name} details`}
        title="View details / Add to Collection"
        onClick={() => onAdd(card)}
      >
        +
      </button>


      </div>
    </article>
  )
}

export default CardSearchResult