'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signup, signInWithGoogle } from '../actions'

function SignupForm() {
  const [error,        setError]        = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [refCode,      setRefCode]      = useState<string | null>(null)
  const [acceptTerms,  setAcceptTerms]  = useState(false)
  const [confirmAge,   setConfirmAge]   = useState(false)
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Capture referral code from URL param and persist in localStorage
    const ref = searchParams.get('ref')
    if (ref) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRefCode(ref.toUpperCase())
      try { localStorage.setItem('nextsplit_referral_code', ref.toUpperCase()) } catch { /* ignore */ }
    } else {
      // Check if already stored (e.g. user navigated away and back)
      try {
        const stored = localStorage.getItem('nextsplit_referral_code')
        if (stored) setRefCode(stored)
      } catch { /* ignore */ }
    }
  }, [searchParams])

  async function applyReferralCode() {
    const code = refCode ?? (() => {
      try { return localStorage.getItem('nextsplit_referral_code') } catch { return null }
    })()
    if (!code) return
    try {
      await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      localStorage.removeItem('nextsplit_referral_code')
    } catch { /* non-fatal */ }
  }

  async function handleSubmit(formData: FormData) {
    if (!acceptTerms || !confirmAge) {
      setError('Please confirm you are 16 or older and accept the Terms and Privacy Policy.')
      return
    }
    // Ensure the server action receives the same consent record the
    // user just acknowledged in the UI.
    formData.set('accept_terms', 'on')
    formData.set('confirm_age',  'on')
    setLoading(true)
    setError(null)
    try {
      const result = await signup(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      } else {
        await applyReferralCode()
        router.push('/onboarding')
      }
    } catch {
      // Server actions throw on redirect() — expected on success
      await applyReferralCode()
      const invite = typeof window !== 'undefined' ? localStorage.getItem('nextsplit_coach_invite_token') : null
      router.push(invite ? `/onboarding?invite=${invite}` : '/onboarding')
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Brand header */}
      <div className="px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--ns-ember)]/20 border border-[var(--ns-ember)]/30 mb-4">
          <span className="text-2xl">🏃</span>
        </div>
        <h1 className="font-display text-2xl tracking-tight" style={{ color: "var(--ns-cyan)", letterSpacing: "-0.03em" }}>NextSplit</h1>
        {refCode ? (
          <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            🎁 You were invited — first month free when you upgrade
          </p>
        ) : (
          <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>AI coaching · Gamified progress · Real plans</p>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full">
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-base font-bold text-center" style={{ color: "var(--color-text-primary)" }}>Create your free account</h2>

          {/* Referral banner */}
          {refCode && (
            <div className="bg-[var(--ns-ember-light)] border border-[var(--ns-ember)]30 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span>🎁</span>
              <p className="text-xs leading-snug" style={{ color: 'var(--ns-ember)' }}>
                <span className="font-bold">Referral applied.</span>{' '}
                Your first month is free when you upgrade to Pro.
              </p>
            </div>
          )}

          {/* Google */}
          <button
            onClick={async () => { setLoading(true); await signInWithGoogle() }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center">
            <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} /><span className="px-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>or</span><div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Your name</label>
              <input name="name" type="text" required
                className="w-full px-3 py-3 rounded-xl text-sm outline-none transition-colors" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
                placeholder="Alex" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Email</label>
              <input name="email" type="email" required autoComplete="email"
                className="w-full px-3 py-3 rounded-xl text-sm outline-none transition-colors" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Password</label>
              <input name="password" type="password" required minLength={8} autoComplete="new-password"
                className="w-full px-3 py-3 rounded-xl text-sm outline-none transition-colors" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
                placeholder="Minimum 8 characters" />
            </div>

            {/* K33 — consents ABOVE the CTA, both mandatory. Submit is
                disabled until both are ticked. Reject-as-easy-as-accept
                is preserved because the user can simply not tick and
                navigate away. */}
            <label className="flex items-start gap-2.5 text-xs leading-snug cursor-pointer pt-1" style={{ color: "var(--color-text-secondary)" }}>
              <input
                type="checkbox"
                name="confirm_age"
                checked={confirmAge}
                onChange={e => setConfirmAge(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[var(--ns-ember)]"
                aria-label="Confirm age 16 or over"
              />
              <span>I am <strong>16 or older</strong>.</span>
            </label>
            <label className="flex items-start gap-2.5 text-xs leading-snug cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
              <input
                type="checkbox"
                name="accept_terms"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[var(--ns-ember)]"
                aria-label="Accept terms and privacy policy"
              />
              <span>
                I have read and accept the <Link href="/terms" target="_blank" className="underline" style={{ color: 'var(--ns-ember)' }}>Terms</Link> and the <Link href="/privacy" target="_blank" className="underline" style={{ color: 'var(--ns-ember)' }}>Privacy Policy</Link>.
              </span>
            </label>

            {error && (
              <p className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)" }}>{error}</p>
            )}

            <button type="submit" disabled={loading || !acceptTerms || !confirmAge}
              className="w-full text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all active:scale-95" style={{ background: "var(--ns-ember)" }}>
              {loading ? 'Creating account…' : 'Create free account →'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "var(--color-text-tertiary)" }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-bold" style={{ color: "var(--ns-ember)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--color-bg)" }} />}>
      <SignupForm />
    </Suspense>
  )
}
