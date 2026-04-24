'use client'

import { useEffect } from 'react'

/**
 * Applies dark_mode and text_size from localStorage to <html>.
 * Dark mode is the DEFAULT — if no preference is stored, dark is applied and saved.
 */
export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function applyTheme() {
      try {
        const stored = localStorage.getItem('nextsplit_dark_mode')

        // If never set before — default to dark and store it
        if (stored === null) {
          localStorage.setItem('nextsplit_dark_mode', 'true')
        }

        const dark = stored === null ? true : stored === 'true'
        const size = localStorage.getItem('nextsplit_text_size') ?? 'default'

        const html = document.documentElement
        html.classList.toggle('dark', dark)
        html.classList.remove('text-size-default', 'text-size-large', 'text-size-xl')
        html.classList.add(`text-size-${size}`)
      } catch {}
    }

    applyTheme()
    window.addEventListener('nextsplit-theme-change', applyTheme)
    return () => window.removeEventListener('nextsplit-theme-change', applyTheme)
  }, [])

  return <>{children}</>
}

// ─── Helper used by Settings to persist + apply immediately ──────────────────

export function setThemePreference(key: 'dark_mode' | 'text_size', value: string | boolean) {
  try {
    localStorage.setItem(`nextsplit_${key}`, String(value))
    window.dispatchEvent(new Event('nextsplit-theme-change'))
  } catch {}
}
