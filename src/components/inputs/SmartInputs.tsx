'use client'

import { useState, useRef } from 'react'

// ── Shared utilities ──────────────────────────────────────────────────────────

/** Convert raw digits (no colons) to H:MM:SS seconds */
export function parseTimeInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits || digits.length < 2) return null

  // Pad to 6 digits then split H MM SS
  const padded = digits.padStart(6, '0')
  const h  = parseInt(padded.slice(0, 2), 10)
  const m  = parseInt(padded.slice(2, 4), 10)
  const s  = parseInt(padded.slice(4, 6), 10)

  if (m > 59 || s > 59) return null
  return h * 3600 + m * 60 + s
}

/** Format seconds → H:MM:SS display string */
export function secsToDisplay(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format a raw typed string into H:MM:SS as the user types */
function formatAsTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (!digits) return ''

  // Build from right: last 2 = seconds, next 2 = minutes, rest = hours
  const padded = digits.padStart(6, '0')
  const h = padded.slice(0, 2).replace(/^0/, '') || '0'
  const m = padded.slice(2, 4)
  const s = padded.slice(4, 6)
  return `${h}:${m}:${s}`
}

/** Parse a distance string — handles "42.2", "42", "42 2" → number */
export function parseDistanceInput(raw: string): number | null {
  const cleaned = raw.replace(',', '.').replace(/[^\d.]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) || n <= 0 ? null : n
}

// ── SmartTimeInput ────────────────────────────────────────────────────────────
// User types digits only — auto-formats to H:MM:SS
// On blur validates and calls onChange with seconds, or null if invalid

interface SmartTimeInputProps {
  value:       number | null        // seconds
  onChange:    (secs: number | null) => void
  placeholder?: string
  label?:      string
  hint?:       string
  className?:  string
  disabled?:   boolean
}

export function SmartTimeInput({
  value,
  onChange,
  placeholder = '0:00:00',
  label,
  hint,
  className = '',
  disabled = false,
}: SmartTimeInputProps) {
  const [raw, setRaw]       = useState(value ? secsToDisplay(value) : '')
  const [focused, setFocused] = useState(false)
  const [error, setError]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    const formatted = formatAsTime(digits)
    setRaw(formatted)
    setError(false)

    // Live parse so parent always has latest value
    const secs = parseTimeInput(digits)
    onChange(secs)
  }

  const handleBlur = () => {
    setFocused(false)
    if (!raw || raw === '0:00:00') {
      setRaw('')
      onChange(null)
      return
    }
    const secs = parseTimeInput(raw)
    if (secs === null || secs <= 0) {
      setError(true)
      onChange(null)
    } else {
      setRaw(secsToDisplay(secs))
      onChange(secs)
      setError(false)
    }
  }

  const handleFocus = () => {
    setFocused(true)
    setError(false)
    // Select all on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 50)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className={`relative flex items-center rounded-xl border-2 transition-all ${
        error   ? 'border-red-400 bg-red-50'
        : focused ? 'border-[var(--ns-ember)] bg-white ring-2 ring-[var(--ns-forest-light)]'
        : raw    ? 'border-slate-300 bg-white'
        : 'border-gray-200 bg-[#f8f8f6]'
      }`}>
        <span className="pl-3 text-gray-400 text-sm select-none">⏱</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-2 py-2.5 text-sm font-mono font-bold text-gray-800 bg-transparent outline-none placeholder:text-gray-300 placeholder:font-normal"
        />
        {raw && !error && (
          <button
            onClick={() => { setRaw(''); onChange(null) }}
            className="pr-3 text-gray-300 hover:text-gray-500 text-lg leading-none"
          >×</button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500">Invalid time — enter digits like 13045 for 1:30:45</p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
}

// ── SmartDistanceInput ────────────────────────────────────────────────────────

interface SmartDistanceInputProps {
  value:      number | null         // km
  onChange:   (km: number | null) => void
  label?:     string
  hint?:      string
  unit?:      string
  max?:       number
  className?: string
}

export function SmartDistanceInput({
  value,
  onChange,
  label,
  hint,
  unit = 'km',
  max = 300,
  className = '',
}: SmartDistanceInputProps) {
  const [raw, setRaw]       = useState(value ? String(value) : '')
  const [focused, setFocused] = useState(false)
  const [error, setError]   = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, one dot, one decimal place
    const cleaned = e.target.value.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d{0,1}).*/, '$1')
    setRaw(cleaned)
    setError(false)
    const n = parseFloat(cleaned)
    onChange(isNaN(n) ? null : n)
  }

  const handleBlur = () => {
    setFocused(false)
    const n = parseFloat(raw)
    if (!raw || isNaN(n) || n <= 0) {
      if (raw) setError(true)
      onChange(null)
    } else if (n > max) {
      setError(true)
      onChange(null)
    } else {
      setRaw(String(n))
      onChange(n)
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      )}
      <div className={`relative flex items-center rounded-xl border-2 transition-all ${
        error    ? 'border-red-400 bg-red-50'
        : focused ? 'border-[var(--ns-ember)] bg-white ring-2 ring-[var(--ns-forest-light)]'
        : raw     ? 'border-slate-300 bg-white'
        : 'border-gray-200 bg-[#f8f8f6]'
      }`}>
        <span className="pl-3 text-gray-400 text-sm select-none">📏</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleChange}
          onFocus={() => { setFocused(true); setError(false) }}
          onBlur={handleBlur}
          placeholder="0.0"
          className="flex-1 px-2 py-2.5 text-sm font-mono font-bold text-gray-800 bg-transparent outline-none placeholder:text-gray-300 placeholder:font-normal"
        />
        <span className="pr-3 text-xs text-gray-400 font-semibold">{unit}</span>
      </div>
      {error && (
        <p className="text-xs text-red-500">Enter a valid distance (e.g. 42.2)</p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
}

// ── SmartPaceInput ────────────────────────────────────────────────────────────
// For per-km pace — formats as M:SS

interface SmartPaceInputProps {
  value:      number | null         // seconds per km
  onChange:   (secs: number | null) => void
  label?:     string
  hint?:      string
  className?: string
}

export function SmartPaceInput({
  value,
  onChange,
  label,
  hint,
  className = '',
}: SmartPaceInputProps) {
  const [raw, setRaw]       = useState(value ? `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}` : '')
  const [focused, setFocused] = useState(false)
  const [error, setError]   = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (!digits) { setRaw(''); onChange(null); return }
    const padded = digits.padStart(4, '0')
    const m = parseInt(padded.slice(0, 2), 10)
    const s = parseInt(padded.slice(2, 4), 10)
    const formatted = `${m}:${String(s).padStart(2, '0')}`
    setRaw(formatted)
    setError(false)
    if (s < 60) onChange(m * 60 + s)
  }

  const handleBlur = () => {
    setFocused(false)
    if (!raw) { onChange(null); return }
    const parts = raw.split(':')
    const m = parseInt(parts[0] ?? '0', 10)
    const s = parseInt(parts[1] ?? '0', 10)
    if (isNaN(m) || isNaN(s) || s > 59) {
      setError(true); onChange(null)
    } else {
      setRaw(`${m}:${String(s).padStart(2, '0')}`)
      onChange(m * 60 + s)
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      )}
      <div className={`relative flex items-center rounded-xl border-2 transition-all ${
        error    ? 'border-red-400 bg-red-50'
        : focused ? 'border-[var(--ns-ember)] bg-white ring-2 ring-[var(--ns-forest-light)]'
        : raw     ? 'border-slate-300 bg-white'
        : 'border-gray-200 bg-[#f8f8f6]'
      }`}>
        <span className="pl-3 text-gray-400 text-sm select-none">🏃</span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          onFocus={() => { setFocused(true); setError(false) }}
          onBlur={handleBlur}
          placeholder="5:30"
          className="flex-1 px-2 py-2.5 text-sm font-mono font-bold text-gray-800 bg-transparent outline-none placeholder:text-gray-300 placeholder:font-normal"
        />
        <span className="pr-3 text-xs text-gray-400 font-semibold">/km</span>
      </div>
      {error && <p className="text-xs text-red-500">Enter pace as M:SS (e.g. 5:30)</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}
