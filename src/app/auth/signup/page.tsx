'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup, signInWithGoogle } from '../actions'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] flex flex-col">
      {/* Brand header */}
      <div className="bg-gradient-to-b from-[#0f172a] to-[#0d3d38] px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 mb-4">
          <span className="text-2xl">🏃</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">NextSplit</h1>
        <p className="text-teal-300 text-sm mt-1">AI coaching · Gamified progress · Real plans</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 max-w-sm mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 text-center">Create your free account</h2>

          {/* Google */}
          <button
            onClick={async () => { setLoading(true); await signInWithGoogle() }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-3">or</div>
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Your name</label>
              <input name="name" type="text" required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition-colors"
                placeholder="Alex" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Email</label>
              <input name="email" type="email" required autoComplete="email"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition-colors"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Password</label>
              <input name="password" type="password" required minLength={8} autoComplete="new-password"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition-colors"
                placeholder="Minimum 8 characters" />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[#0D9488] text-white py-3 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-50">
              {loading ? 'Creating account…' : 'Create free account →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center">
            By signing up you agree to our terms and privacy policy.
          </p>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#0D9488] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
