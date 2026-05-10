'use client'

import { useRef } from 'react'

// BL-X1 — extracted from TodayClient. Horizontal swipe detection with
// the same thresholds the inline handlers used:
//   · |dx| ≥ 40px to register as a swipe at all
//   · |dx| > |dy| × 1.5 to discriminate horizontal from vertical scroll
// onSwipeLeft / onSwipeRight fire once per gesture; either may be omitted.

interface SwipeHandlers {
  onSwipeLeft?:  () => void
  onSwipeRight?: () => void
}

interface SwipeBindings {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd:   (e: React.TouchEvent) => void
}

const MIN_HORIZONTAL_PX = 40
const HORIZONTAL_BIAS   = 1.5

export function useTouchSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers): SwipeBindings {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  return {
    onTouchStart: (e) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    },
    onTouchEnd: (e) => {
      if (touchStartX.current === null || touchStartY.current === null) return
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = e.changedTouches[0].clientY - touchStartY.current
      touchStartX.current = null
      touchStartY.current = null
      if (Math.abs(dx) < MIN_HORIZONTAL_PX || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_BIAS) return
      if (dx < 0) onSwipeLeft?.()
      else        onSwipeRight?.()
    },
  }
}
