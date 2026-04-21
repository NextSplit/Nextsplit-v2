'use client'

/**
 * ReferralCard — shown in Profile tab.
 * Growth Pillar spec: "Highest-motivation trigger moments:
 * post-race, class reveal, first PB. Feels like sharing something you're proud of,
 * not a discount code."
 *
 * Gated by PostHog feature flag 'referral_programme'.
 * Build now — release when Day 30 retention ≥ 40%.
 */

import { useState, useEffect } from 'react'
import { buildShareText } from '@/lib/referral'
import { Analytics } from '@/lib/analytics'

interface ReferralData {
  code:           string
  shareUrl:       string
  referralCount:  number
  displayName:    string | null
}

interface Props {
  // Trigger context — different copy depending on where shown
  trigger?: 'profile' | 'post_race' | 'class_reveal' | 'first_pb'
}

export default function ReferralCard({ trigger = 'profile' }: Props) {
  const [data, setData]       = useState<ReferralData | null>(null)
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(d => { if (d.code) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleShare() {
    if (!data) return
    const text = buildShareText(data.displayName?.split(' ')[0] ?? null)
    Analytics.referralSent()

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'NextSplit — Training that keeps up with your life',
          text,
          url: data.shareUrl,
        })
        return
      } catch { /* fallthrough to copy */ }
    }

    // Fallback — copy to clipboard
    try {
      await navigator.clipboard.writeText(`${text}${data.shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  async function copyCode() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  if (loading) return null  // Don't show skeleton — appears mid-scroll, would feel janky

  if (!data) return null

  // Copy per trigger context
  const headlines: Record<string, string> = {
    profile:      'Invite a runner, both get a free month',
    post_race:    'Share the feeling — invite a friend to train together',
    class_reveal: "Know a runner who'd like this? Invite them",
    first_pb:     'Who helped you get here? Invite them to NextSplit',
  }
  const headline = headlines[trigger] ?? headlines.profile

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ background: 'var(--ns-forest)', color: 'white' }}>
        <span className="text-base">🎁</span>
        <div className="flex-1">
          <p className="text-xs font-bold opacity-70 uppercase tracking-wider">Referral</p>
          <p className="text-sm font-bold">{headline}</p>
        </div>
        {data.referralCount > 0 && (
          <div className="bg-white/20 rounded-lg px-2.5 py-1 text-center">
            <p className="text-xs font-black">{data.referralCount}</p>
            <p className="text-[9px] opacity-70">referred</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Reward explanation — legible, not discount-coded */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-base font-black" style={{ color: 'var(--ns-forest)' }}>1 month</p>
            <p className="text-[10px] text-gray-500 mt-0.5">free for you</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-base font-black" style={{ color: 'var(--ns-forest)' }}>1 month</p>
            <p className="text-[10px] text-gray-500 mt-0.5">free for them</p>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed text-center">
          When someone signs up with your link and upgrades to Pro,
          you both get a free month. No limit on referrals.
        </p>

        {/* Referral link display */}
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <p className="text-xs text-gray-500 font-mono flex-1 truncate">{data.shareUrl}</p>
          <button
            onClick={copyCode}
            className="text-xs font-bold flex-shrink-0 transition-colors"
            style={{ color: copied ? '#10b981' : 'var(--ns-forest)' }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{ background: 'var(--ns-forest)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share with a runner
        </button>

        {/* Your code */}
        <p className="text-center text-[10px] text-gray-400">
          Your code: <span className="font-black tracking-widest text-gray-600">{data.code}</span>
        </p>
      </div>
    </div>
  )
}
