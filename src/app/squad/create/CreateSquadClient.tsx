'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SQUAD_COLOURS = [
  { hex: '#c49a3c', name: 'Gold' },
  { hex: '#84cc16', name: 'Forest' },
  { hex: '#ff4d6d', name: 'Ember' },
  { hex: '#1e3a5f', name: 'Navy' },
  { hex: '#7c3aed', name: 'Purple' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#0891b2', name: 'Cyan' },
  { hex: '#059669', name: 'Emerald' },
]

const NUDGE_PREVIEW = [
  "Your squad misses you — time to lace up! 👟",
  "One run can change your whole week. Let's go 🔥",
  "Don't break the streak now, you're so close ⚡",
]

export default function CreateSquadClient() {
  const router = useRouter()
  const [step, setStep]             = useState<1 | 2 | 3>(1)
  const [name, setName]             = useState('')
  const [colour, setColour]         = useState('#c49a3c')
  const [welcomeMsg, setWelcomeMsg] = useState('')
  const [isPublic, setIsPublic]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/squad', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, colour, welcome_msg: welcomeMsg, is_public: isPublic }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      // Delay + hard navigation to bust Next.js cache on /squad
      await new Promise(r => setTimeout(r, 800))
      // Use window.location for hard navigation — bypasses Next.js cache
      window.location.href = '/squad'
    } catch {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  const canProceed1 = name.trim().length >= 2
  const canProceed2 = true // welcome msg is optional

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-6" style={{
        background: `linear-gradient(180deg, ${colour}18 0%, var(--color-bg) 100%)`
      }}>
        <div className="max-w-lg mx-auto">
          <div className="text-4xl mb-2">👑</div>
          <h1 className="font-display text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
            Create your squad
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Lead up to 5 friends. Keep each other running.
          </p>

          {/* Step dots */}
          <div className="flex gap-2 mt-4">
            {[1,2,3].map(s => (
              <div key={s} className="h-1 rounded-full flex-1 transition-all"
                style={{ background: s <= step ? colour : 'var(--color-surface-2)' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">

        {/* ── STEP 1: Name + Colour ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Squad name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
                placeholder="e.g. The Early Birds, Ash's Crew..."
                className="w-full text-base font-bold outline-none bg-transparent"
                style={{ color: 'var(--color-text-primary)' }}
                autoFocus
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Min 2 characters
                </span>
                <span className="text-xs" style={{ color: name.length > 25 ? 'var(--ns-ember)' : 'var(--color-text-tertiary)' }}>
                  {name.length}/30
                </span>
              </div>
            </div>

            {/* Colour picker */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Squad colour
              </p>
              <div className="grid grid-cols-4 gap-3">
                {SQUAD_COLOURS.map(c => (
                  <button key={c.hex} onClick={() => setColour(c.hex)}
                    className="relative h-12 rounded-xl transition-all active:scale-95"
                    style={{ background: c.hex }}>
                    {colour === c.hex && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke={c.hex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
                This colour will theme your squad dashboard
              </p>
            </div>

            {/* Preview card */}
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: `${colour}15`, border: `1px solid ${colour}40` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: colour }}>👑</div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                  {name || 'Your Squad Name'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Split Leader · 0/5 members
                </p>
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!canProceed1}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all active:scale-95 disabled:opacity-40"
              style={{ background: colour }}>
              Next — Set welcome message →
            </button>
          </div>
        )}

        {/* ── STEP 2: Welcome message ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Welcome message
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                This appears when someone opens your invite link. Make it personal.
              </p>
              <textarea
                value={welcomeMsg}
                onChange={e => setWelcomeMsg(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Hey! Join our squad and let's keep each other running. No judgement, just consistency 🏃"
                className="w-full text-sm outline-none bg-transparent resize-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Optional</span>
                <span className="text-xs" style={{ color: welcomeMsg.length > 180 ? 'var(--ns-ember)' : 'var(--color-text-tertiary)' }}>
                  {welcomeMsg.length}/200
                </span>
              </div>
            </div>

            {/* Preview of what invitee sees */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Preview — what your invite link shows
              </p>
              <div className="rounded-xl p-3" style={{ background: `${colour}12`, border: `1px solid ${colour}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: colour }}>👑</div>
                  <div>
                    <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>0 members · 0km this month</p>
                  </div>
                </div>
                {welcomeMsg && (
                  <p className="text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
                    &ldquo;{welcomeMsg}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="rounded-2xl p-5 flex items-center justify-between"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Public squad page</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  Anyone can find and view your squad's stats
                </p>
              </div>
              <button onClick={() => setIsPublic(p => !p)}
                className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                style={{ background: isPublic ? colour : 'var(--color-surface-2)' }}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isPublic ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-2xl font-bold text-sm border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                ← Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-[2] py-4 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
                style={{ background: colour }}>
                Next — Review →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review + Create ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Your squad — ready to launch
              </p>

              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: colour }}>👑</div>
                <div>
                  <p className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {isPublic ? 'Public' : 'Private'} squad · up to 5 members
                  </p>
                </div>
              </div>

              {welcomeMsg && (
                <p className="text-sm italic mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  &ldquo;{welcomeMsg}&rdquo;
                </p>
              )}

              <div className="space-y-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-start gap-2">
                  <span>👑</span>
                  <span>You become a <strong style={{ color: 'var(--color-text-primary)' }}>Split Leader</strong> — your avatar gets a crown</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>📣</span>
                  <span>You'll get a unique invite link to share with up to <strong style={{ color: 'var(--color-text-primary)' }}>5 friends</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span>🎁</span>
                  <span>Earn <strong style={{ color: 'var(--color-text-primary)' }}>1 free month</strong> for every friend who joins Premium</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>💪</span>
                  <span>Send nudges when your squad needs a push</span>
                </div>
              </div>
            </div>

            {/* Preview nudge messages */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}>
                Nudge messages you can send
              </p>
              <div className="space-y-2">
                {NUDGE_PREVIEW.map(msg => (
                  <div key={msg} className="text-xs px-3 py-2 rounded-xl"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                    {msg}
                  </div>
                ))}
                <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  + 5 more messages available
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} disabled={saving}
                className="flex-1 py-4 rounded-2xl font-bold text-sm border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                ← Back
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-[2] py-4 rounded-2xl font-bold text-white text-sm transition-all active:scale-95 disabled:opacity-60"
                style={{ background: colour }}>
                {saving ? 'Creating…' : '🚀 Launch squad'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
