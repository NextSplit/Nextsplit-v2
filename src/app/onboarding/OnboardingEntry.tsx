'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PATHS = [
  {
    href: '/onboarding/predetermined',
    emoji: '📋',
    title: 'Structured plan',
    desc: 'Expert-designed plans from 5K to 100 miles',
    tag: 'Most popular',
    tagColor: 'bg-teal-500',
    accent: 'border-teal-500/30 hover:border-teal-500/60',
  },
  {
    href: '/onboarding/ai',
    emoji: '🤖',
    title: 'AI bespoke plan',
    desc: 'Fully personalised around your goal and schedule',
    tag: 'Recommended',
    tagColor: 'bg-violet-500',
    accent: 'border-violet-500/30 hover:border-violet-500/60',
  },
  {
    href: '/onboarding/manual',
    emoji: '✏️',
    title: 'Build your own',
    desc: 'Your sessions, our structure and tracking',
    tag: null,
    tagColor: '',
    accent: 'border-white/10 hover:border-white/25',
  },
  {
    href: '/onboarding/lifestyle',
    emoji: '🌿',
    title: 'Lifestyle training',
    desc: 'No race goals — run for health and enjoyment',
    tag: null,
    tagColor: '',
    accent: 'border-white/10 hover:border-white/25',
  },
]

export default function OnboardingEntry() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="min-h-screen flex flex-col px-5 pt-16 pb-10"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #18181b 60%, #0f172a 100%)' }}>

      {/* Brand header */}
      <div className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/30 mb-4">
          <span className="text-3xl">🏃</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">NextSplit</h1>
        <p className="text-zinc-400 text-sm mt-1.5">How do you want to train?</p>
      </div>

      {/* Path cards */}
      <div className={`space-y-3 mb-8 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {PATHS.map((path, i) => (
          <Link
            key={path.href}
            href={path.href}
            className={`block rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98] ${path.accent}`}
            style={{
              background: 'rgba(255,255,255,0.04)',
              transitionDelay: `${i * 40}ms`,
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{path.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-white">{path.title}</span>
                  {path.tag && (
                    <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${path.tagColor}`}>
                      {path.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-snug">{path.desc}</p>
              </div>
              <span className="text-zinc-600 text-lg flex-shrink-0">›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Skip */}
      <div className={`text-center transition-all duration-700 delay-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <Link href="/today" className="text-xs text-zinc-600 hover:text-zinc-400 py-2 inline-block">
          Skip for now — set up later
        </Link>
      </div>
    </main>
  )
}
