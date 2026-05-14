'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { acceptTermsAction } from './action'

/**
 * K33 — post-OAuth interstitial.
 *
 * The OAuth callback routes a freshly-signed-in user here when their
 * profile has no terms_accepted_at, no age_confirmed_at, or an
 * out-of-date terms_version. Both checkboxes are required; declining
 * is a one-tap exit back to the login screen (signs the user out).
 *
 * Mirrors the email-signup consent gate so the two paths produce the
 * same audit-trail evidence.
 */
function AcceptTermsForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/home'

  const [acceptTerms, setAcceptTerms] = useState(false)
  const [confirmAge,  setConfirmAge]  = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleAccept() {
    if (!acceptTerms || !confirmAge) {
      setError('Please confirm you are 16 or older and accept the Terms and Privacy Policy.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await acceptTermsAction()
      if (res?.error) {
        setError(res.error)
        setLoading(false)
        return
      }
      router.push(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <div className="flex-1 px-6 py-12 max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--ns-ember)]/20 border border-[var(--ns-ember)]/30 mb-4">
            <span className="text-2xl">📜</span>
          </div>
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>
            One quick thing
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Before we get started, please confirm:
          </p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <label className="flex items-start gap-2.5 text-sm leading-snug cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={confirmAge}
              onChange={e => setConfirmAge(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[var(--ns-ember)]"
              aria-label="Confirm age 16 or over"
            />
            <span>I am <strong>16 or older</strong>.</span>
          </label>

          <label className="flex items-start gap-2.5 text-sm leading-snug cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[var(--ns-ember)]"
              aria-label="Accept terms and privacy policy"
            />
            <span>
              I have read and accept the{' '}
              <Link href="/terms" target="_blank" className="underline" style={{ color: 'var(--ns-ember)' }}>Terms</Link>
              {' '}and the{' '}
              <Link href="/privacy" target="_blank" className="underline" style={{ color: 'var(--ns-ember)' }}>Privacy Policy</Link>.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>{error}</p>
          )}

          <button
            onClick={handleAccept}
            disabled={loading || !acceptTerms || !confirmAge}
            className="w-full text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
            style={{ background: 'var(--ns-ember)' }}
          >
            {loading ? 'Saving…' : 'Continue →'}
          </button>

          <Link
            href="/auth/login?signed_out=true"
            className="block text-center text-xs underline pt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Sign out
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function AcceptTermsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--color-bg)' }} />}>
      <AcceptTermsForm />
    </Suspense>
  )
}
