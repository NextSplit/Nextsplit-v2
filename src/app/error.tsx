'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-[#f8f8f6] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-400 mb-8 max-w-xs">
        An unexpected error occurred. Your data is safe.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-[#0D9488] text-white px-5 py-3 rounded-xl text-sm font-semibold"
        >
          Try again
        </button>
        <a
          href="/today"
          className="border border-gray-200 text-gray-600 px-5 py-3 rounded-xl text-sm font-semibold bg-white"
        >
          Go home
        </a>
      </div>
    </main>
  )
}
