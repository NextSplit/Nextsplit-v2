'use client'

import { useEffect } from 'react'

/**
 * Reads dark_mode and text_size from localStorage (written by Settings page)
 * and applies the corresponding classes to <html>.
 * This runs client-side only to avoid SSR mismatch.
 */
export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function applyTheme() {
      try {
        const dark    = localStorage.getItem('nextsplit_dark_mode') === 'true'
        const size    = localStorage.getItem('nextsplit_text_size') ?? 'default'

        const html = document.documentElement
        html.classList.toggle('dark', dark)
        html.classList.remove('text-size-default', 'text-size-large', 'text-size-xl')
        html.classList.add(`text-size-${size}`)
      } catch {}
    }

    applyTheme()

    // Re-apply if storage changes (e.g. Settings page saves)
    window.addEventListener('nextsplit-theme-change', applyTheme)
    return () => window.removeEventListener('nextsplit-theme-change', applyTheme)
  }, [])

  return <>{children}</>
}

// ─── Helper used by Settings page to persist + apply immediately ─────────────

export function setThemePreference(key: 'dark_mode' | 'text_size', value: string | boolean) {
  try {
    localStorage.setItem(`nextsplit_${key}`, String(value))
    window.dispatchEvent(new Event('nextsplit-theme-change'))
  } catch {}
}
