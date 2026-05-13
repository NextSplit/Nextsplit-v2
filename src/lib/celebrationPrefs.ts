/**
 * Celebration audio + haptics preferences.
 *
 * Persisted in localStorage so user choice survives reload. Read with
 * `getCelebrationSoundMuted()` before triggering audio in celebration UI;
 * write with `setCelebrationSoundMuted(true)` from the in-celebration
 * mute toggle and from the /you settings panel.
 *
 * iOS Safari blocks Web Audio API calls outside a user-gesture handler,
 * so even when the user has sound enabled, audio may silently no-op on
 * first mount. That's expected — we don't surface that to the user.
 */

const STORAGE_KEY = 'nextsplit:celebration_sound_muted'

export function getCelebrationSoundMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setCelebrationSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (muted) window.localStorage.setItem(STORAGE_KEY, '1')
    else       window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* localStorage unavailable */
  }
}
