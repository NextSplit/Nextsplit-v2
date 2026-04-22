'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SPECIALITIES = [
  '5K & 10K', 'Half Marathon', 'Marathon', 'Ultra', 'Trail Running',
  'Triathlon', 'Beginners', 'Speed & Track', 'Strength & Conditioning',
  'Injury Rehabilitation', 'Weight Loss', 'Masters Athletes',
]

interface Props {
  defaultName: string
  defaultSlug: string
}

export default function CoachSetupClient({ defaultName, defaultSlug }: Props) {
  const router = useRouter()
  const [step, setStep]           = useState(1)
  const [tier, setTier]           = useState<'split_leader' | 'professional'>('split_leader')
  const [displayName, setDisplayName] = useState(defaultName)
  const [slug, setSlug]           = useState(defaultSlug.replace('@', ''))
  const [bio, setBio]             = useState('')
  const [credentials, setCredentials] = useState('')
  const [specialities, setSpecialities] = useState<string[]>([])
  const [location, setLocation]   = useState('')
  const [instagram, setInstagram] = useState('')
  const [rate, setRate]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const toggleSpeciality = (s: string) =>
    setSpecialities(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/coach/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          display_name:     displayName,
          slug:             slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          bio,
          credentials,
          specialities,
          location,
          instagram_handle: instagram.replace('@', ''),
          rate_monthly_gbp: rate ? parseFloat(rate) : null,
          tier,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      router.push('/coach/squad?setup=complete')
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-gray-900">Become a coach</h1>
          <p className="text-sm text-gray-500 mt-1">Step {step} of 3</p>
          <div className="flex gap-1 mt-3">
            {[1,2,3].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-[var(--ns-forest)]' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* Step 1 — Tier selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800">What kind of coach are you?</h2>
            {[
              {
                id:    'split_leader' as const,
                emoji: '👥',
                title: 'Split Leader',
                desc:  'Informal coaching — friends, running club, social following. Free, instant approval. Up to 5 runners.',
                detail: ['No accreditation needed', 'Free to use', 'Up to 5 athletes', 'Share plans informally'],
              },
              {
                id:    'professional' as const,
                emoji: '🏆',
                title: 'Professional Coach',
                desc:  'Accredited or experienced coaches. Sell plans, charge for coaching, unlimited athletes.',
                detail: ['£29/mo platform fee', 'Sell plans in marketplace', 'Unlimited athletes', 'Verification available'],
              },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setTier(option.id)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  tier === option.id ? 'border-[var(--ns-forest)] bg-[var(--ns-forest-light)]' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{option.title}</p>
                      {tier === option.id && <span className="text-xs text-[var(--ns-forest)] font-bold">Selected ✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    <ul className="mt-2 space-y-1">
                      {option.detail.map(d => (
                        <li key={d} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[var(--ns-forest)] shrink-0" />{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setStep(2)}
              className="w-full bg-[var(--ns-forest)] text-white py-3.5 rounded-2xl text-sm font-bold active:scale-95"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Profile */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800">Your coach profile</h2>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coach name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)]"
                  placeholder="e.g. Sarah Jones Running" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile URL</label>
                <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
                  <span className="px-3 py-2.5 bg-[#f8f8f6] text-xs text-gray-400 border-r border-gray-200 shrink-0">nextsplit.app/coach/</span>
                  <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2.5 text-sm outline-none" placeholder="sarah-jones" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)] resize-none"
                  placeholder="Tell athletes about your background and coaching style…" />
              </div>

              {tier === 'professional' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Credentials</label>
                  <textarea value={credentials} onChange={e => setCredentials(e.target.value)} rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)] resize-none"
                    placeholder="e.g. UKA Level 3, 10 years coaching marathons…" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location (optional)</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)]"
                  placeholder="e.g. London, UK" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Instagram (optional)</label>
                <input value={instagram} onChange={e => setInstagram(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)]"
                  placeholder="@yourhandle" />
              </div>

              {tier === 'professional' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monthly coaching rate (£)</label>
                  <input value={rate} onChange={e => setRate(e.target.value)} type="number" min="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)]"
                    placeholder="e.g. 80" />
                  <p className="text-xs text-gray-400">Recommended: £40–£200/mo depending on level</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600">←</button>
              <button onClick={() => setStep(3)} disabled={!displayName || !slug}
                className="flex-1 bg-[var(--ns-forest)] text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-40">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Specialities */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800">What do you specialise in?</h2>
            <p className="text-sm text-gray-500">Select all that apply</p>

            <div className="flex flex-wrap gap-2">
              {SPECIALITIES.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSpeciality(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    specialities.includes(s)
                      ? 'bg-[var(--ns-forest)] text-white border-[var(--ns-forest)]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600">←</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-[var(--ns-forest)] text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-95">
                {loading ? 'Creating profile…' : 'Create coach profile →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
