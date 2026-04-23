import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NextSplit — AI Running Coach',
  description: 'Personalised training plans, AI coaching, injury risk analytics and a professional coach marketplace. Built for runners who mean it.',
}

const FEATURES = [
  {
    emoji: '🧠',
    title: 'AI coaching that knows your body',
    body: 'Your coach card reads every session you log — pace, effort, soreness, sleep — and gives you feedback that feels like it came from someone who actually tracked your training. Because it did.',
  },
  {
    emoji: '📋',
    title: 'Plans built around your life',
    body: 'Four paths: pick from 17 expert plans, generate a bespoke AI plan around your goal and schedule, build your own, or let the app shape training around your lifestyle. Gym sessions built in. Runs that make sense.',
  },
  {
    emoji: '📊',
    title: 'Analytics that mean something',
    body: 'ACWR training load, pace zones from your actual runs, race day predictions using Riegel projection, weekly coaching debrief. The same tools used by elite coaches — readable by normal humans.',
  },
  {
    emoji: '👥',
    title: 'Real coaches, in the same app',
    body: 'Connect with a verified coach. They see your logs, your wellness, your load — and coach you inside NextSplit. No switching apps, no screenshots, no WhatsApp chaos.',
  },
  {
    emoji: '🏆',
    title: 'Training that keeps you honest',
    body: 'Your RPG character levels up as you train. XP, badges, streak fire, season leagues. Gamification that actually reflects your fitness — not just your app opens.',
  },
  {
    emoji: '🤝',
    title: 'A community that gets it',
    body: 'Clubs, weekly leaderboards, virtual races with real finish times. Train alone, compete together. Season XP resets every month so everyone has a shot at the top.',
  },
]

const STATS = [
  { value: '17',    label: 'Expert training plans' },
  { value: '4',     label: 'Onboarding paths'      },
  { value: '500',   label: 'Founding spots'        },
  { value: '£7.99', label: 'Per month to start'   },
]

const TESTIMONIALS = [
  {
    quote: "I\'ve used Garmin Coach, Runna, TrainingPeaks. NextSplit is the first one that actually explains why I\'m doing each session.",
    name: 'Marathon runner, 3:41 PB',
  },
  {
    quote: "My coach can see everything in one place. I stopped sending screenshots of my Garmin watch.",
    name: 'Coached athlete, sub-20 5K',
  },
  {
    quote: "The ACWR chart flagged that I was overreaching two weeks before my shin splints started. I wish I\'d listened.",
    name: 'Ultra runner, 100K finisher',
  },
]

const PLAN_TYPES = [
  { label: 'Predetermined',  desc: '17 expert plans, any goal',   emoji: '📋' },
  { label: 'AI Bespoke',     desc: 'Built for you by Claude',     emoji: '🧠' },
  { label: 'Manual',         desc: 'Total control, your way',     emoji: '✏️' },
  { label: 'Lifestyle',      desc: 'Adapts to your schedule',     emoji: '🌿' },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-black text-base tracking-tight">NextSplit</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-white/50 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/auth/signup" className="bg-white text-black text-sm font-bold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--ns-forest)]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[var(--ns-forest)]/10 border border-[var(--ns-forest)]/20 rounded-full px-4 py-1.5 mb-8 text-sm text-[var(--ns-forest-light)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ns-forest-mid)] animate-pulse" />
            500 founding spots — £7.99/mo locked in forever
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6">
            The running coach
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
              that reads your data.
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI coaching, personalised training plans, injury risk analytics, and a professional coach marketplace.
            Built for serious amateur runners who want more than a PDF.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/signup" className="w-full sm:w-auto bg-[var(--ns-forest)] hover:bg-[var(--ns-forest-mid)] text-white font-black text-base px-8 py-4 rounded-xl transition-all">
              Start training free →
            </Link>
            <Link href="/auth/login" className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all">
              Sign in
            </Link>
          </div>
          <p className="text-sm text-white/25 mt-4">Free to start · 7-day trial for Elite · No card required</p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-white mb-1">{s.value}</p>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[var(--ns-forest-mid)] uppercase tracking-widest mb-3">What it does</p>
            <h2 className="text-4xl font-black tracking-tight">
              Everything a serious runner needs.
              <br />
              <span className="text-white/30">Nothing they don't.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-[#0a0a0a] p-8 space-y-4 hover:bg-white/[0.03] transition-colors">
                <span className="text-3xl">{f.emoji}</span>
                <h3 className="text-base font-bold text-white leading-snug">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding paths */}
      <section className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[var(--ns-forest-mid)] uppercase tracking-widest mb-3">Getting started</p>
            <h2 className="text-3xl font-black tracking-tight">Your plan, your way.</h2>
            <p className="text-white/40 mt-3 text-sm max-w-lg mx-auto">
              Four paths into training — from expert-curated plans to fully bespoke AI generation.
              All include gym sessions, race targets, and weekly adaptation.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PLAN_TYPES.map(p => (
              <div key={p.label} className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-5 text-center hover:border-[var(--ns-forest)]/30 hover:bg-[var(--ns-forest)]/5 transition-all">
                <span className="text-3xl mb-3 block">{p.emoji}</span>
                <p className="text-sm font-bold text-white mb-1">{p.label}</p>
                <p className="text-[11px] text-white/40 leading-snug">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coach platform */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-teal-950 via-[#0a2a24] to-[#0a0a0a] rounded-3xl border border-[var(--ns-forest)]/20 p-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--ns-forest)]/10 rounded-full blur-3xl" />
            <div className="relative grid sm:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-bold text-[var(--ns-forest-mid)] uppercase tracking-widest mb-4">For coaches</p>
                <h2 className="text-3xl font-black tracking-tight mb-4">Your athletes.<br />One dashboard.</h2>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                  See every athlete's training load, wellness, ACWR, and adherence in real time.
                  Leave annotations. Message directly. Publish plans. Get paid.
                </p>
                <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-[var(--ns-forest)] text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-[var(--ns-forest-mid)] transition-all">
                  Become a coach →
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { emoji: '🟢', name: 'Sarah K.',  detail: 'W8/16 · ACWR 1.12 · On track' },
                  { emoji: '🟡', name: 'Marcus T.', detail: 'W3/20 · ACWR 1.31 · Check in' },
                  { emoji: '🔴', name: 'Priya N.',  detail: '4 days inactive · Needs you'  },
                ].map(a => (
                  <div key={a.name} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                    <span className="text-lg">{a.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{a.name}</p>
                      <p className="text-[11px] text-white/40">{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[var(--ns-forest-mid)] uppercase tracking-widest mb-3">Early feedback</p>
            <h2 className="text-2xl font-black">From runners who've tried it.</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-6 space-y-4">
                <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-sm">★</span>)}</div>
                <p className="text-sm text-white/70 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-[11px] text-white/30 font-medium">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold text-[var(--ns-forest-mid)] uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-4xl font-black tracking-tight mb-4">Start free.<br /><span className="text-white/30">Upgrade when ready.</span></h2>
          <p className="text-white/40 text-sm mb-12 max-w-md mx-auto">
            Core training is free. Elite features are £7.99/mo for founding members — rising to £13.99 after the first 500.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 text-left">
              <p className="text-base font-black text-white mb-1">Free</p>
              <p className="text-3xl font-black text-white mb-4">£0</p>
              <ul className="space-y-2 text-sm text-white/50 mb-6">
                {['Training plan + session logging','Basic AI coaching','Community & clubs','Character + XP system','Race history'].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-[var(--ns-forest-mid)]">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/auth/signup" className="block w-full text-center bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl transition-all text-sm">
                Get started
              </Link>
            </div>
            <div className="bg-teal-950 border border-[var(--ns-forest)]/30 rounded-2xl p-6 text-left relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">⭐ FOUNDING</div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-[var(--ns-forest)]/10 rounded-full blur-2xl" />
              <p className="text-base font-black text-white mb-1">Elite</p>
              <div className="flex items-baseline gap-2 mb-4">
                <p className="text-3xl font-black text-white">£7.99</p>
                <p className="text-white/40 text-sm">/month forever</p>
              </div>
              <ul className="space-y-2 text-sm text-white/70 mb-6">
                {['Everything in Free','Unlimited AI coaching','ACWR + race predictions','Weekly coaching debrief','Adaptive plan','Coach marketplace','Founding badge'].map(f => (
                  <li key={f} className="flex items-center gap-2"><span className="text-[var(--ns-forest-mid)]">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/auth/signup" className="relative block w-full text-center bg-[var(--ns-forest)] hover:bg-[var(--ns-forest-mid)] text-white font-black py-3 rounded-xl transition-all text-sm">
                Claim founding spot →
              </Link>
              <p className="text-[10px] text-[var(--ns-forest-light)]/50 text-center mt-2">7-day free trial · cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4">Serious training starts here.</h2>
          <p className="text-white/40 text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Join runners training for 5Ks to ultras. No generic plans. No guesswork. Just coaching that moves with you.
          </p>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-white text-black font-black text-base px-10 py-4 rounded-xl hover:bg-white/90 transition-all">
            Start training free →
          </Link>
          <p className="text-white/20 text-xs mt-4">Takes 3 minutes · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-black text-sm">NextSplit</span>
            <span className="text-white/20 text-xs ml-2">AI-powered running coaching</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/auth/login" className="hover:text-white/60 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
