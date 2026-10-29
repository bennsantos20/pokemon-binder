// Aborting saves work; the identity check also rejects responses from transports
// that finish despite cancellation.
export function createLatestRequest() {
  let active: AbortController | null = null
  return {
    start() {
      active?.abort()
      const controller = new AbortController()
      active = controller
      return { signal: controller.signal, isCurrent: () => active === controller && !controller.signal.aborted }
    },
    cancel() {
      active?.abort()
      active = null
    },
  }
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}
