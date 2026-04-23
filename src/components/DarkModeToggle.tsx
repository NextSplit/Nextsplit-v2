'use client'

import { useEffect, useState } from 'react'
import { setThemePreference } from '@/components/ThemeWrapper'

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    setThemePreference('dark_mode', next)
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-90"
    >
      {dark ? (
        // Sun icon
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" y2="3" />
          <line x1="12" y1="21" y2="23" />
          <line x1="4.22" y1="4.22" y2="5.64" />
          <line x1="18.36" y1="18.36" y2="19.78" />
          <line x1="1" y1="12" y2="12" />
          <line x1="21" y1="12" y2="12" />
          <line x1="4.22" y1="19.78" y2="18.36" />
          <line x1="18.36" y1="5.64" y2="4.22" />
        </svg>
      ) : (
        // Moon icon
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
