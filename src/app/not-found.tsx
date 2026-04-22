import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">🏃</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-sm text-gray-400 mb-8 max-w-xs">
        Looks like you took a wrong turn. This page doesn&apos;t exist.
      </p>
      <Link
        href="/today"
        className="inline-block bg-[var(--ns-forest)] text-white px-6 py-3 rounded-xl text-sm font-semibold"
      >
        Back to Today →
      </Link>
    </main>
  )
}
