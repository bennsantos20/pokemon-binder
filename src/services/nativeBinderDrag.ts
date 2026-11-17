export const BINDER_DRAG_TYPE = 'application/x-pokemon-binder-drag'
type Transfer = Pick<DataTransfer, 'types' | 'getData' | 'setData'>
let nextDragId = 0

/** One native drag session per App; transfer data contains no card/collection metadata. */
export function createNativeBinderDrag() {
  let active: { slotId: string; token: string; owner: Pick<Element, 'isConnected'> } | null = null
  function end() { active = null }
  function accepts(transfer: Transfer) {
    try {
      // getData is protected during dragover. Only inspect the advertised types here.
      return Boolean(active?.owner.isConnected && Array.from(transfer.types).includes(BINDER_DRAG_TYPE))
    } catch { return false }
  }
  return {
    end,
    start(slotId: string, transfer: Transfer, owner: Pick<Element, 'isConnected'>) {
      end()
      if (!owner.isConnected) return false
      const token = `${++nextDragId}:${Math.random().toString(36).slice(2)}`
      try {
        // Add our marker without replacing the browser's drag image or other formats.
        transfer.setData(BINDER_DRAG_TYPE, token)
        active = { slotId, token, owner }
        return true
      } catch { return false }
    },
    accepts,
    take(transfer: Transfer) {
      const session = active
      const acceptedType = accepts(transfer)
      end() // A successful or rejected drop consumes the session exactly once.
      try {
        return acceptedType && session && transfer.getData(BINDER_DRAG_TYPE) === session.token
          ? session.slotId : null
      } catch { return null }
    },
  }
}
