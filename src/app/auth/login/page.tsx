'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login, signInWithGoogle } from '../actions'

export default function LoginPage() {
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true); setError(null)
    try {
      const result = await login(formData)
      if (result?.error) { setError(result.error); setLoading(false) }
      else router.push('/today')
    } catch { setError('Something went wrong'); setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true); setError(null)
    try {
      const result = await signInWithGoogle()
      if (result?.error) { setError(result.error); setLoading(false) }
    } catch { setError('Something went wrong'); setLoading(false) }
  }

  const inputCls = `w-full px-3 py-3 rounded-xl text-sm outline-none transition-colors`
  const inputStyle = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-2)',
    color: 'var(--color-text-primary)',
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-6 pt-16 pb-10 text-center"
        style={{ background: 'linear-gradient(180deg, #0f2818 0%, var(--color-bg) 100%)' }}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{ background: 'rgba(43,92,63,0.3)', border: '1px solid rgba(43,92,63,0.5)' }}>
          <span className="text-2xl">🏃</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">NextSplit</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Track. Log. Level up.
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-6 max-w-sm mx-auto w-full">
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-base font-bold text-center" style={{ color: 'var(--color-text-primary)' }}>
            Sign in to your account
          </h2>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)', color: 'var(--color-text-primary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
            <span className="px-3 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>or</span>
            <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
          </div>

          {/* Email form */}
          <form onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>Email</label>
              <input name="email" type="email" required autoComplete="email"
                className={inputCls} style={inputStyle} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>Password</label>
              <input name="password" type="password" required autoComplete="current-password"
                className={inputCls} style={inputStyle} placeholder="••••••••" />
            </div>

            {error && (
              <p className="text-xs text-red-400 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
              style={{ background: 'var(--ns-forest)' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-tertiary)' }}>
          No account?{' '}
          <Link href="/auth/signup" className="font-bold" style={{ color: 'var(--ns-ember)' }}>
            Sign up free
          </Link>
        </p>

        <div className="mt-6 text-center space-y-1">
          <Link href="/privacy" className="text-[10px] mx-2" style={{ color: 'var(--color-text-tertiary)' }}>Privacy</Link>
          <Link href="/terms"   className="text-[10px] mx-2" style={{ color: 'var(--color-text-tertiary)' }}>Terms</Link>
        </div>
      </div>
    </main>
  )
}
