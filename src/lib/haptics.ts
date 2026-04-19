/**
 * Haptic feedback utility.
 * Uses Web Vibration API — works on Android, silently ignored on iOS.
 * Never throws — safe to call everywhere.
 */

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {}
}

/** Short tap — session logged, button press */
export function hapticLight() {
  vibrate(50)
}

/** Double tap — PB achieved, level up */
export function hapticSuccess() {
  vibrate([60, 40, 100])
}

/** Triple pulse — plan complete, big milestone */
export function hapticCelebration() {
  vibrate([80, 50, 80, 50, 150])
}

/** Warning — destructive action confirm */
export function hapticWarning() {
  vibrate([30, 50, 30])
}
