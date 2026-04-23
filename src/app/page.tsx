import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NextSplit — The running coach that reads your data',
  description: 'Personalised training plans, AI coaching, and injury risk analytics. Built for serious amateur runners.',
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0c0c0c] text-white overflow-x-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c0c0c]/90 backdrop-blur-md border-b border-white/8">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="font-black text-base tracking-tight">NextSplit</span>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-white/40 hover:text-white transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/auth/signup"
              className="text-sm font-bold px-4 py-2 rounded-lg transition-all"
              style={{ background: '#ff4d6d', color: 'white' }}>
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-5">
        {/* Background glow */}
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[100px] pointer-events-none opacity-20"
          style={{ background: '#ff4d6d' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Pill */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-bold border"
            style={{ background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)', color: '#4ade80' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
            500 founding spots · £7.99/mo locked in forever
          </div>

          <h1 className="font-black tracking-tight leading-none mb-6" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>
            The running coach
            <br />
            <span style={{ color: '#4ade80' }}>that reads your data.</span>
          </h1>

          <p className="text-white/50 max-w-xl mx-auto mb-10 leading-relaxed" style={{ fontSize: '1.05rem' }}>
            AI coaching, personalised training plans, and injury risk analytics.
            Built for serious amateur runners who want more than a PDF.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Link href="/auth/signup"
              className="w-full sm:w-auto font-black text-base px-8 py-4 rounded-xl transition-all active:scale-95"
              style={{ background: '#ff4d6d', color: 'white' }}>
              Start training free →
            </Link>
            <Link href="/auth/login"
              className="w-full sm:w-auto font-semibold text-base px-8 py-4 rounded-xl transition-all border border-white/10 text-white/60 hover:text-white hover:border-white/20">
              Sign in
            </Link>
          </div>
          <p className="text-white/20 text-xs">Free to start · No card required</p>
        </div>
      </section>

      {/* 3 core pillars — tight, scannable */}
      <section className="py-16 px-5 border-y border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8">
          {[
            {
              icon: '🧠',
              title: 'AI coaching after every session',
              body: 'Reads your pace, effort, sleep, and soreness. Gives feedback that sounds like a coach who actually watched you run.',
            },
            {
              icon: '📊',
              title: 'Plans that adapt to real life',
              body: 'Miss a session? Travel? Low energy? The plan reshapes around you. ACWR training load keeps injury risk in check.',
            },
            {
              icon: '👥',
              title: 'Real coaches, same app',
              body: 'Connect with a verified coach. They see your logs, your load, your wellness — and coach you without the WhatsApp chaos.',
            },
          ].map(f => (
            <div key={f.title} className="space-y-3">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-bold text-white leading-snug">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-10" style={{ color: 'rgba(255,255,255,0.25)' }}>
            From runners who've tried it
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                quote: "The first coaching app that actually explains why I'm doing each session.",
                who: 'Marathon runner, 3:41 PB',
              },
              {
                quote: "The ACWR chart flagged I was overreaching two weeks before my shin splints.",
                who: 'Ultra runner, 100K finisher',
              },
              {
                quote: "My coach sees everything in one place. No more screenshot chaos.",
                who: 'Coached athlete, sub-20 5K',
              },
            ].map(t => (
              <div key={t.who} className="rounded-2xl p-5 border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-xs" style={{ color: '#f59e0b' }}>★</span>)}
                </div>
                <p className="text-sm leading-relaxed italic mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{t.who}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — simple, 2-tier */}
      <section className="py-16 px-5 border-t border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black tracking-tight mb-2">Simple pricing.</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Core training is free. Upgrade for AI coaching, adaptation, and analytics.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Free */}
            <div className="rounded-2xl p-6 border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="font-black text-white mb-1">Free</p>
              <p className="text-4xl font-black text-white mb-5">£0</p>
              <ul className="space-y-2 mb-6">
                {[
                  'Training plans + session logging',
                  'Basic community features',
                  'Character + XP system',
                  'Race history',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: '#4ade80' }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup"
                className="block w-full text-center font-bold py-3 rounded-xl text-sm transition-all border border-white/10 text-white/60 hover:text-white hover:border-white/20">
                Get started
              </Link>
            </div>

            {/* Elite */}
            <div className="rounded-2xl p-6 border relative overflow-hidden"
              style={{ background: 'rgba(232,93,38,0.08)', borderColor: 'rgba(232,93,38,0.3)' }}>
              <div className="absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: '#f59e0b', color: '#78350f' }}>
                FOUNDING
              </div>
              <p className="font-black text-white mb-1">Elite</p>
              <div className="flex items-baseline gap-2 mb-5">
                <p className="text-4xl font-black text-white">£7.99</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>/month forever</p>
              </div>
              <ul className="space-y-2 mb-6">
                {[
                  'Everything in Free',
                  'Unlimited AI coaching',
                  'ACWR + injury risk analytics',
                  'Adaptive plan engine',
                  'Coach marketplace access',
                  'Founding member badge',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: '#4ade80' }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup"
                className="block w-full text-center font-black py-3 rounded-xl text-sm transition-all active:scale-95"
                style={{ background: '#ff4d6d', color: 'white' }}>
                Claim founding spot →
              </Link>
              <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                7-day free trial · cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-5">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4">Serious training starts here.</h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Join runners training for 5Ks to ultras. No generic plans. No guesswork.
          </p>
          <Link href="/auth/signup"
            className="inline-flex items-center gap-2 font-black text-base px-10 py-4 rounded-xl transition-all active:scale-95"
            style={{ background: 'white', color: 'black' }}>
            Start training free →
          </Link>
          <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>Takes 3 minutes · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-5 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-black text-sm">NextSplit</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>AI running coaching</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/auth/login" className="hover:text-white/60 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
