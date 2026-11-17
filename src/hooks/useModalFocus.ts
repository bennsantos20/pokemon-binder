import { useLayoutEffect, useRef } from 'react'
import { activateModal, captureModalReturnFocus } from '../services/modalFocus'

export function useModalFocus(onClose: () => void, initialFocus?: string) {
  const ref = useRef<HTMLDivElement>(null)
  const returnFocus = useRef(captureModalReturnFocus())
  const close = useRef(onClose)
  useLayoutEffect(() => { close.current = onClose })
  useLayoutEffect(() => {
    if (ref.current) return activateModal(ref.current, { onClose: () => close.current(), initialFocus, returnFocus: returnFocus.current })
  }, [initialFocus])
  return ref
}
