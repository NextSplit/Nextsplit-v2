'use client'

import { useState, useRef } from 'react'

// PR J11c — Profile section for importing a .fit or .tcx workout file.
// Acts as the fallback when the user doesn't connect Strava or Garmin
// — they can export from HealthKit / Google Fit / their watch's web app
// and drop the file here.

interface ParsedResult {
  source:        string
  start_time:    string
  km:            number
  duration_secs: number
  avg_hr:        number | null
}

export default function FileImportSection() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy]     = useState(false)
  const [result, setResult] = useState<{ ok: true; parsed: ParsedResult } | { ok: false; msg: string } | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/import/file', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.parsed) {
        setResult({ ok: true, parsed: data.parsed })
      } else if (res.status === 409) {
        setResult({ ok: false, msg: 'Already imported (same activity time)' })
      } else {
        setResult({ ok: false, msg: data.error ?? 'Import failed' })
      }
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Import a run
      </p>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
        Drop a <span className="font-mono">.fit</span> or <span className="font-mono">.tcx</span> file
        (Garmin Connect, HealthKit export, Wahoo, Suunto, etc.).
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".fit,.tcx,application/vnd.ant.fit"
        onChange={onPick}
        disabled={busy}
        className="hidden"
      />
      <button onClick={() => inputRef.current?.click()} disabled={busy}
        className="w-full py-3 rounded-xl font-black text-sm disabled:opacity-40 active:scale-95"
        style={{ background: 'var(--ns-cyan)', color: '#0a0e1a' }}>
        {busy ? 'Importing…' : '📁 Choose file'}
      </button>

      {result?.ok && (
        <div className="mt-3 rounded-xl p-3 text-xs"
          style={{ background: 'rgba(34,197,94,0.10)', border: '1.5px solid rgba(34,197,94,0.40)' }}>
          <p className="font-black" style={{ color: '#22c55e' }}>
            ✓ Imported {result.parsed.km.toFixed(1)} km
          </p>
          <p className="mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {Math.floor(result.parsed.duration_secs / 60)}:{String(result.parsed.duration_secs % 60).padStart(2, '0')}
            {result.parsed.avg_hr && <> · {result.parsed.avg_hr} bpm avg</>}
            {' '}·{' '}{new Date(result.parsed.start_time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      )}
      {result && !result.ok && (
        <p className="mt-3 text-xs" style={{ color: '#ef4444' }}>✗ {result.msg}</p>
      )}
    </div>
  )
}
