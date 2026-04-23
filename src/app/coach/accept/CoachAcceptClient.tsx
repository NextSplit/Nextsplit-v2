'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token:          string
  coachName:      string
  coachBio:       string | null
  coachVerified:  boolean
  specialities:   string[]
}

export default function CoachAcceptClient({
  token, coachName, coachBio, coachVerified, specialities,
}: Props) {
  const router = useRouter()
  const [shareNutrition,  setShareNutrition]  = useState(false)
  const [shareBodyWeight, setShareBodyWeight] = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/coach/accept', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, share_nutrition: shareNutrition, share_body_weight: shareBodyWeight }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      router.push('/today?notice=coach_connected')
    } catch {
      setError('Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 py-10 space-y-5">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-[var(--ns-forest-light)] flex items-center justify-center text-3xl mx-auto">
            🏃
          </div>
          <h1 className="text-xl font-black text-gray-900">
            {coachName} wants to coach you
          </h1>
          {coachVerified && (
            <span className="inline-flex items-center gap-1 bg-[var(--ns-forest-light)] border border-[var(--ns-forest-light)] text-[var(--ns-ember)] text-xs font-bold px-2.5 py-1 rounded-full">
              ✅ Verified coach
            </span>
          )}
        </div>

        {/* Coach info */}
        {(coachBio || specialities.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            {coachBio && <p className="text-sm text-gray-600">{coachBio}</p>}
            {specialities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {specialities.map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* What they'll see */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">What your coach will see</p>

          {[
            { label: 'Training logs & sessions', desc: 'Every run and gym session you log', on: true, locked: true },
            { label: 'Wellness & readiness', desc: 'Sleep, soreness and energy scores', on: true, locked: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <div className="w-8 h-5 bg-[var(--ns-ember)] rounded-full flex items-center justify-end pr-0.5">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          ))}

          {/* Optional toggles */}
          {[
            { label: 'Nutrition diary', desc: 'Daily food and calorie logs', value: shareNutrition, set: setShareNutrition },
            { label: 'Body weight', desc: 'Weight logs from wellness check-ins', value: shareBodyWeight, set: setShareBodyWeight },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1 border-t border-slate-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc} · <span className="text-gray-500">Off by default</span></p>
              </div>
              <button
                onClick={() => item.set(!item.value)}
                className={`w-8 h-5 rounded-full flex items-center transition-all ${item.value ? 'bg-[var(--ns-ember)] justify-end pr-0.5' : 'bg-gray-200 justify-start pl-0.5'}`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center px-4">
          You can change these permissions anytime in Settings → Coach Access. You can disconnect from your coach at any time.
        </p>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}

        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full bg-[var(--ns-ember)] text-white py-4 rounded-2xl text-base font-black disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? 'Connecting…' : `Accept ${coachName} as my coach →`}
        </button>

        <button
          onClick={() => router.push('/today')}
          className="w-full text-gray-400 text-sm py-2"
        >
          Decline
        </button>
      </div>
    </main>
  )
}
