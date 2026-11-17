import type { HTMLAttributes } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'

// Keeps the existing custom dialog markup and CSS; focus behavior is shared.
export default function AccessibleDialog({ onClose, initialFocus, ...props }: HTMLAttributes<HTMLDivElement> & {
  onClose: () => void
  initialFocus?: string
}) {
  const ref = useModalFocus(onClose, initialFocus)
  return <div {...props} ref={ref} role={props.role ?? 'dialog'} aria-modal="true" tabIndex={-1} />
}
