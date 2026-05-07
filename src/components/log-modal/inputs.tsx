'use client'

// Input sub-components for LogModal, extracted in P1.0 / L2 (council /council
// 2026-05-07). Pure presentational pieces — all state lives upstream in
// useLogFormState (L1, cdf8fd5). LogModal renders these across its 4 modes
// (rest, one-tap, full-debrief, standard). No behaviour change from the
// pre-extraction inline definitions; this is a literal file split to reduce
// LogModal's surface from ~539 lines toward the council's ≤250 target.

export function EffortSlider({ effort, setEffort }: { effort: number; setEffort: (n: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Effort (RPE)</label>
        <span className="text-2xl font-bold" style={{ color: 'var(--ns-ember)' }}>
          {effort}<span className="text-sm text-[var(--color-text-tertiary)]">/10</span>
        </span>
      </div>
      <input type="range" min={1} max={10} value={effort}
        onChange={e => setEffort(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--ns-cyan)]" />
      <div className="flex justify-between text-[10px] text-[var(--color-text-tertiary)] mt-1">
        <span>Easy</span><span>Moderate</span><span>Max</span>
      </div>
    </div>
  )
}

export function KmPicker({ km, setKm, planned }: { km: number; setKm: (n: number) => void; planned?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Distance</label>
        {planned && planned > 0 && (
          <button onClick={() => setKm(planned)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--ns-ember-light)', color: 'var(--ns-ember)' }}>
            Use planned {planned}km
          </button>
        )}
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          max="200"
          value={km || ''}
          onChange={e => {
            const v = parseFloat(e.target.value)
            setKm(isNaN(v) ? 0 : Math.round(v * 10) / 10)
          }}
          placeholder={planned ? `${planned}` : '0.0'}
          className="w-full rounded-xl px-4 py-3 text-lg font-data font-bold focus:outline-none focus:ring-2"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold"
          style={{ color: 'var(--color-text-tertiary)' }}>km</span>
      </div>
    </div>
  )
}

export function DurationPicker({ mins, setMins }: { mins: number; setMins: (n: number) => void }) {
  return (
    <div>
      <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
        Time <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-tertiary)' }}>minutes</span>
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="600"
          value={mins || ''}
          onChange={e => {
            const v = parseInt(e.target.value)
            setMins(isNaN(v) ? 0 : Math.max(0, v))
          }}
          placeholder="0"
          className="w-full rounded-xl px-4 py-3 text-lg font-data font-bold focus:outline-none focus:ring-2"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold"
          style={{ color: 'var(--color-text-tertiary)' }}>min</span>
      </div>
    </div>
  )
}

export function PaceInput({ paceInput, setPaceInput, autoPace, onBlur, showKm }: {
  paceInput: string; setPaceInput: (s: string) => void
  autoPace: string | null; onBlur: () => void; showKm: boolean
}) {
  if (!showKm) return null
  return (
    <div>
      <label className="text-sm font-bold block mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Pace <span className="text-[10px] text-[var(--color-text-tertiary)] font-normal">format: m:ss</span>
      </label>
      <div className="relative">
        <input type="text" inputMode="decimal" value={paceInput}
          onChange={e => setPaceInput(e.target.value)} onBlur={onBlur}
          placeholder={autoPace ? `Auto: ${autoPace}` : '5:30'}
          className="w-full border border-[var(--color-border-2)] rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)] pr-14" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-tertiary)]">/km</span>
      </div>
      {autoPace && !paceInput && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--ns-ember)' }}>Auto: {autoPace}/km</p>
      )}
    </div>
  )
}

export function NotesInput({ notes, setNotes, placeholder }: { notes: string; setNotes: (s: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-bold block mb-2" style={{ color: 'var(--color-text-primary)' }}>Notes</label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder={placeholder ?? 'How did it feel? Any issues?'} rows={2}
        className="w-full border border-[var(--color-border-2)] rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-[var(--color-text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ns-ember)]" />
    </div>
  )
}

export function DiscardWarning({ show, onKeep, onDiscard }: { show: boolean; onKeep: () => void; onDiscard: () => void }) {
  if (!show) return null
  return (
    <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
      <p className="text-xs font-semibold text-amber-800 mb-2">Discard your changes?</p>
      <div className="flex gap-2">
        <button onClick={onKeep} className="flex-1 py-2 rounded-lg border border-amber-200 text-xs font-semibold text-amber-700">Keep editing</button>
        <button onClick={onDiscard} className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold">Discard</button>
      </div>
    </div>
  )
}
