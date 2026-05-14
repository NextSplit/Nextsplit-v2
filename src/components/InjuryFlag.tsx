'use client'

import { useState } from 'react'

const BODY_AREAS = [
  { id: 'knee',     label: 'Knee',      emoji: '🦵' },
  { id: 'shin',     label: 'Shin',      emoji: '🦴' },
  { id: 'ankle',    label: 'Ankle',     emoji: '🦶' },
  { id: 'hip',      label: 'Hip',       emoji: '⬛' },
  { id: 'back',     label: 'Back',      emoji: '🔙' },
  { id: 'hamstring',label: 'Hamstring', emoji: '🦵' },
  { id: 'calf',     label: 'Calf',      emoji: '💪' },
  { id: 'foot',     label: 'Foot',      emoji: '🦶' },
]

const SEVERITY = [
  { level: 1, label: 'Minor niggle', desc: 'Barely notice it', colour: '#ffb800' },
  { level: 2, label: 'Noticeable',   desc: 'Present throughout run', colour: '#ff7438' },
  { level: 3, label: 'Sharp or worsening', desc: 'Affecting form or gait', colour: '#ff3d6e' },
]

interface Props {
  sessionCode?: string | null
  onSave: (flag: { area: string; severity: number; notes?: string } | null) => void
}

/**
 * K33 MHRA Path B — body-check prompt offered AFTER any logged session,
 * not just hard sessions. Easy-run stress fractures are exactly the
 * cohort the council flagged as currently invisible.
 *
 * Severity 1 + 2: log the flag, continue.
 * Severity 3: HARD STOP. No AI suggestion. Static medical-assessment
 *   message. The flag is still saved so the user has a record, but
 *   the path explicitly does not generate AI training advice.
 */
export default function InjuryFlag({ sessionCode: _sessionCode, onSave }: Props) {
  // _sessionCode retained for backwards compat; gating is removed per K33.
  void _sessionCode

  const [step,     setStep]     = useState<'prompt' | 'area' | 'severity' | 'severe' | 'done'>('prompt')
  const [area,     setArea]     = useState<string | null>(null)
  const [severity, setSeverity] = useState<number | null>(null)

  if (step === 'done') {
    return (
      <div className="rounded-2xl px-4 py-3 mt-3 flex items-center gap-2"
        style={{ background: 'rgba(0,230,118,0.08)', border: '1.5px solid rgba(0,230,118,0.25)' }}>
        <span className="text-sm">✅</span>
        <p className="text-xs font-bold" style={{ color: '#00e676' }}>Body check logged</p>
      </div>
    )
  }

  if (step === 'severe') {
    return (
      <div
        className="rounded-2xl p-4 mt-3"
        role="alert"
        aria-live="assertive"
        style={{ background: 'rgba(255,61,110,0.10)', border: '2px solid #ff3d6e' }}
      >
        <p className="text-sm font-black mb-2" style={{ color: '#ff3d6e' }}>
          Stop running on this.
        </p>
        <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Sharp, localised or worsening pain — especially anything that
          changes your gait — needs a medical assessment before your next
          session. We&rsquo;ve logged the flag and will <strong>not</strong>{' '}
          suggest training advice for this entry.
        </p>
        <p className="text-[10px] mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          NHS 111 if you&rsquo;re unsure where to start, or contact your
          GP / physiotherapist. NextSplit&rsquo;s AI is informational only
          and not a medical service.
        </p>
        <button
          onClick={() => { if (area && severity) onSave({ area, severity }); setStep('done') }}
          className="w-full py-3 rounded-xl font-black text-xs"
          style={{ background: '#ff3d6e', color: 'white' }}
        >
          Log and rest
        </button>
      </div>
    )
  }

  if (step === 'prompt') {
    return (
      <div className="rounded-2xl p-4 mt-3"
        style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)' }}>
        <p className="text-xs font-black mb-3" style={{ color: 'var(--color-text-primary)' }}>
          🏥 Anything hurting after that session?
        </p>
        <div className="flex gap-2">
          <button onClick={() => { onSave(null); setStep('done') }}
            className="flex-1 py-2.5 rounded-xl font-black text-xs"
            style={{ background: 'rgba(0,230,118,0.12)', border: '2px solid rgba(0,230,118,0.35)', color: '#00e676' }}>
            All good ✓
          </button>
          <button onClick={() => setStep('area')}
            className="flex-1 py-2.5 rounded-xl font-black text-xs"
            style={{ background: 'rgba(255,61,110,0.12)', border: '2px solid rgba(255,61,110,0.35)', color: '#ff3d6e' }}>
            Something&apos;s sore
          </button>
        </div>
      </div>
    )
  }

  if (step === 'area') {
    return (
      <div className="rounded-2xl p-4 mt-3"
        style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)' }}>
        <p className="text-xs font-black mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Where is the pain?
        </p>
        <div className="grid grid-cols-4 gap-2">
          {BODY_AREAS.map(a => (
            <button key={a.id} onClick={() => { setArea(a.id); setStep('severity') }}
              className="rounded-xl py-2.5 text-center"
              style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
              <div className="text-lg">{a.emoji}</div>
              <div className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {a.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'severity') {
    return (
      <div className="rounded-2xl p-4 mt-3"
        style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)' }}>
        <p className="text-xs font-black mb-3" style={{ color: 'var(--color-text-primary)' }}>
          How bad is it?
        </p>
        <div className="space-y-2 mb-3">
          {SEVERITY.map(s => (
            <button key={s.level} onClick={() => setSeverity(s.level)}
              className="w-full rounded-xl px-3 py-2.5 text-left"
              style={{
                background: severity === s.level ? `${s.colour}15` : 'var(--color-surface)',
                border: `2px solid ${severity === s.level ? s.colour : 'var(--color-border)'}`,
              }}>
              <span className="text-xs font-black" style={{ color: s.colour }}>{s.label}</span>
              <span className="text-[10px] ml-2" style={{ color: 'var(--color-text-tertiary)' }}>{s.desc}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (!area || !severity) return
            // K33: severity 3 hard-stops the AI suggestion path. No
            // "Log & get advice" — replace with a medical-assessment
            // message and a Log-and-rest action.
            if (severity === 3) { setStep('severe'); return }
            onSave({ area, severity })
            setStep('done')
          }}
          disabled={!severity}
          className="w-full py-3 rounded-xl font-black text-xs disabled:opacity-40"
          style={{ background: severity === 3 ? '#ff3d6e' : 'var(--ns-ember)', color: 'white' }}>
          {severity === 3 ? 'Continue →' : 'Log it →'}
        </button>
      </div>
    )
  }

  return null
}
