'use client'

import Image from 'next/image'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token:         string
  coachName:     string
  coachBio:      string | null
  coachVerified: boolean
  coachLocation: string | null
  specialities:  string[]
  photoUrl:      string | null
}

export default function InviteLandingClient({
  token, coachName, coachBio, coachVerified, coachLocation, specialities, photoUrl,
}: Props) {
  const router = useRouter()

  // Store token in localStorage so it survives signup flow
  useEffect(() => {
    try {
      localStorage.setItem('nextsplit_coach_invite_token', token)
    } catch { /* ignore */ }
  }, [token])

  const handleSignup = () => {
    // Token is stored in localStorage — signup → onboarding → auto-connect
    router.push(`/auth/signup?invite=${token}`)
  }

  const handleLogin = () => {
    router.push(`/auth/login?invite=${token}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0d3d38] to-[#0f172a] flex flex-col">

      {/* Hero */}
      <div className="px-6 pt-14 pb-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-[var(--ns-ember)]/20 border border-[var(--ns-ember)]/30 rounded-full px-3 py-1.5 mb-2">
          <span className="text-xs text-[var(--ns-cyan-light)] font-semibold">You've been invited</span>
        </div>

        {/* Coach avatar */}
        <div className="flex justify-center">
          {photoUrl ? (
            <Image src={photoUrl} alt={coachName} width={80} height={80} className="rounded-3xl object-cover border-2 border-[var(--ns-ember)]/30" />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-[var(--ns-ember)]/20 border-2 border-[var(--ns-ember)]/30 flex items-center justify-center text-4xl">
              🏃
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">
            Train with {coachName}
          </h1>
          {coachVerified && (
            <span className="inline-flex items-center gap-1 bg-[var(--ns-ember)]/20 border border-[var(--ns-ember)]/30 text-[var(--ns-cyan-light)] text-xs font-bold px-2.5 py-1 rounded-full">
              ✅ Verified NextSplit Coach
            </span>
          )}
          {coachLocation && (
            <p className="text-[var(--color-text-tertiary)] text-sm">📍 {coachLocation}</p>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 space-y-4 pb-10">

        {/* Coach bio */}
        {coachBio && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-sm text-gray-300 leading-relaxed">{coachBio}</p>
          </div>
        )}

        {/* Specialities */}
        {specialities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {specialities.map(s => (
              <span key={s} className="text-xs bg-[var(--ns-ember)]/20 text-[var(--ns-cyan-light)] border border-[var(--ns-ember)]/30 px-2.5 py-1 rounded-full font-medium">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* What is NextSplit */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">What you're joining</p>
          {[
            { emoji: '🧠', text: 'AI coaching that adapts to your actual training data' },
            { emoji: '📋', text: 'Personalised training plan built around your goals' },
            { emoji: '🏋️', text: 'Gym sessions built into every plan' },
            { emoji: '👥', text: `${coachName} sees your progress and coaches you directly` },
            { emoji: '🏆', text: 'Track PBs, earn XP, level up your runner character' },
          ].map(f => (
            <div key={f.text} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="shrink-0">{f.emoji}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Exclusive offer */}
        <div className="bg-gradient-to-r from-amber-500/20 to-amber-400/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <p className="text-sm font-black text-amber-300">Exclusive founding member offer</p>
          </div>
          <p className="text-xs text-amber-200/80">
            Join through {coachName}'s invite and lock in NextSplit Elite at <span className="font-bold">£7.99/mo forever</span> — our founding member rate. Price rises for new users soon.
          </p>
          <p className="text-xs text-amber-300/60">Optional — you can always upgrade later</p>
        </div>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSignup}
            className="w-full bg-[var(--ns-ember)] text-white py-4 rounded-2xl text-base font-black active:scale-95 transition-all hover:bg-[var(--ns-cyan-mid)]"
          >
            Join NextSplit & connect with {coachName} →
          </button>
          <button
            onClick={handleLogin}
            className="w-full bg-white/10 border border-white/20 text-white py-3.5 rounded-2xl text-sm font-bold active:scale-95"
          >
            Already have an account? Sign in
          </button>
        </div>

        <p className="text-center text-xs text-[var(--color-text-tertiary)] px-4">
          Free to join · No card required · 7-day Elite trial included
        </p>
      </div>
    </main>
  )
}
