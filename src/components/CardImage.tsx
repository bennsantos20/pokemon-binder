import { useState } from 'react'
import type { CSSProperties } from 'react'

interface CardImageProps {
  cardId: string
  name: string
  image?: string
  className?: string
  decorative?: boolean
  loading?: 'lazy' | 'eager'
  draggable?: boolean
  style?: CSSProperties
}

function ImageContent({ name, image, className, decorative, ...attributes }: CardImageProps) {
  const [failed, setFailed] = useState(false)
  if (!image?.trim() || failed) {
    return <div className={`card-image-fallback ${className ?? ''}`}
      style={attributes.style} draggable={attributes.draggable}
      role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${name}, image unavailable`}>
      <div aria-hidden="true">{name}<br />Image unavailable</div>
    </div>
  }
  return <img src={`${image}/high.webp`} alt={decorative ? '' : name}
    className={className} loading={attributes.loading} draggable={attributes.draggable}
    style={attributes.style} onError={() => setFailed(true)} />
}

// A new identity/URL gets a fresh failure state; stale image errors stay on the old instance.
export default function CardImage(props: CardImageProps) {
  return <ImageContent key={JSON.stringify([props.cardId, props.image])} {...props} />
}
