import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { accessibilityChanges } from '../services/accessibility'
import type { AccessibilitySnapshot } from '../services/accessibility'

export default function AccessibilityStatus(snapshot: AccessibilitySnapshot) {
  const previous = useRef(snapshot)
  const [announcement, setAnnouncement] = useState({ text: '', sequence: 0 })
  const announce = useEffectEvent((text: string) => {
    setAnnouncement(previous => ({ text, sequence: previous.sequence + 1 }))
  })
  useEffect(() => {
    const message = accessibilityChanges(previous.current, snapshot)
    previous.current = snapshot
    if (message) announce(message)
  }, [snapshot])
  return (
    <div className="sr-only" role="status" aria-atomic="true" data-action-status>
      <span key={announcement.sequence}>{announcement.text}</span>
    </div>
  )
}
