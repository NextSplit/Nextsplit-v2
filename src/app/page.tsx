import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🏃</div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
          NextSplit
        </h1>
        <p className="text-[#666] text-sm tracking-widest uppercase">
          Intelligent running training
        </p>
      </div>

      {/* Value props */}
      <div className="max-w-sm w-full space-y-3 mb-10">
        {[
          { icon: '📋', text: 'Structured plans from 5k to 100 miles' },
          { icon: '🤖', text: 'AI-generated bespoke coaching' },
          { icon: '📊', text: 'Race readiness and injury risk analytics' },
          { icon: '🏋️', text: 'Integrated gym and nutrition tracking' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 text-[#aaa] text-sm">
            <span className="text-lg">{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="max-w-sm w-full space-y-3">
        <Link
          href="/auth/signup"
          className="block w-full bg-white text-[#1a1a1a] text-center font-semibold py-3.5 rounded-xl text-sm hover:bg-gray-100 transition-colors"
        >
          Get started — it&apos;s free
        </Link>
        <Link
          href="/auth/login"
          className="block w-full bg-transparent text-[#aaa] text-center font-medium py-3.5 rounded-xl text-sm border border-[#333] hover:border-[#555] transition-colors"
        >
          Sign in
        </Link>
      </div>

      <p className="text-[#444] text-xs mt-8 text-center max-w-xs">
        No subscription required to start. Premium features available for serious athletes.
      </p>
    </main>
  )
}
