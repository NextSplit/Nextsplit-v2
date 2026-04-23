'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CoachProfile, CoachReview } from '@/types/database'

interface Plan {
  id: string; name: string; distance: string; level: string
  weeks_min: number; weeks_max: number; description: string | null
}
interface Props {
  coach: CoachProfile; plans: Plan[]; isOwnProfile: boolean; viewerLoggedIn: boolean
}
const LEVEL_COLOUR: Record<string, string> = {
  beginner: '#059669', intermediate: '#d97706', advanced: '#ff4d6d',
}

function Stars({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-${size} h-${size}`} viewBox="0 0 20 20"
          fill={i <= Math.round(rating) ? '#c49a3c' : 'none'}
          stroke={i <= Math.round(rating) ? '#c49a3c' : '#5a8a6a'} strokeWidth={1.5}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: CoachReview }) {
  const name = review.is_anonymous ? 'Anonymous runner'
    : (review.profiles?.display_name ?? review.profiles?.handle ?? 'Runner')
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{name}</p>
          <div className="mt-0.5"><Stars rating={review.rating} size={3} /></div>
        </div>
        {review.would_recommend && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#05966920', color: '#059669' }}>✓ Recommends</span>
        )}
      </div>
      {review.review_text && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          &ldquo;{review.review_text}&rdquo;
        </p>
      )}
      <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
        {new Date(review.published_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  )
}

export default function CoachProfileClient({ coach, plans, isOwnProfile, viewerLoggedIn }: Props) {
  const [reviews, setReviews]             = useState<CoachReview[]>([])
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  const [showRequest, setShowRequest]     = useState(false)
  const [requestSent, setRequestSent]     = useState(false)
  const [requestNote, setRequestNote]     = useState('')
  const [sending, setSending]             = useState(false)
  const [activeTab, setActiveTab]         = useState<'about'|'plans'|'reviews'>('about')

  useEffect(() => {
    if (activeTab === 'reviews' && !reviewsLoaded) {
      fetch(`/api/coaches/reviews?coach_id=${coach.user_id}`)
        .then(r => r.json())
        .then(d => { setReviews(d.reviews ?? []); setReviewsLoaded(true) })
        .catch(() => setReviewsLoaded(true))
    }
  }, [activeTab, reviewsLoaded, coach.user_id])

  async function sendRequest() {
    if (!requestNote.trim()) return
    setSending(true)
    try {
      await fetch('/api/coach/plan-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: coach.user_id, message: requestNote }),
      })
      setRequestSent(true)
    } finally { setSending(false) }
  }

  const verBadge = coach.verification_tier === 'elite'
    ? { label: '⭐ Elite Coach', bg: '#c49a3c30', color: '#c49a3c' }
    : coach.verification_tier === 'credential_verified'
    ? { label: '✅ Credential Verified', bg: '#8b5cf630', color: '#4ade80' }
    : coach.verified ? { label: '✓ Listed', bg: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }
    : null

  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* Hero */}
      <div className="px-4 pt-14 pb-6" style={{ background: 'linear-gradient(180deg, #1e3a5f40 0%, var(--color-bg) 100%)' }}>
        <div className="max-w-lg mx-auto">
          <Link href="/coaches" className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Find a coach
          </Link>

          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-3xl overflow-hidden flex-shrink-0 flex items-center justify-center text-4xl"
              style={{ background: 'var(--color-surface-2)' }}>
              {coach.photo_url
                ? <Image src={coach.photo_url} alt={coach.display_name} width={80} height={80} className="w-full h-full object-cover" />
                : '🏃'}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                  {coach.display_name}
                </h1>
                {coach.is_featured && (
                  <span className="text-[9px] font-black px-2 py-1 rounded-full mt-1" style={{ background: '#c49a3c', color: '#0f1a14' }}>⭐ FEATURED</span>
                )}
              </div>
              {verBadge && (
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
                  style={{ background: verBadge.bg, color: verBadge.color }}>{verBadge.label}</span>
              )}
              {coach.location && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  📍 {coach.location}{coach.timezone ? ` · ${coach.timezone}` : ''}
                </p>
              )}
              {coach.avg_rating > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Stars rating={coach.avg_rating} />
                  <span className="text-sm font-bold font-data" style={{ color: 'var(--color-text-primary)' }}>{coach.avg_rating.toFixed(1)}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>({coach.review_count} reviews)</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { value: coach.total_athletes, label: 'athletes' },
              { value: `${Math.round(coach.completion_rate)}%`, label: 'completion' },
              { value: coach.review_count, label: 'reviews' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-lg font-black font-data" style={{ color: 'var(--color-text-primary)' }}>{s.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing + CTA */}
      <div className="px-4 mb-4">
        <div className="max-w-lg mx-auto rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid #1e3a5f60' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              {coach.rate_monthly_gbp && (
                <p className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                  £{coach.rate_monthly_gbp}<span className="text-sm font-normal ml-1" style={{ color: 'var(--color-text-tertiary)' }}>/month</span>
                </p>
              )}
              {coach.rate_plan_gbp && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>One-off plan from £{coach.rate_plan_gbp}</p>}
              {coach.group_coaching && coach.group_price_gbp && <p className="text-xs mt-0.5" style={{ color: '#c49a3c' }}>👥 Group: £{coach.group_price_gbp}/mo</p>}
            </div>
            {isOwnProfile
              ? <Link href="/coach/setup" className="px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>Edit profile</Link>
              : coach.accepting_athletes
                ? viewerLoggedIn
                  ? <button onClick={() => setShowRequest(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 flex-shrink-0 transition-all" style={{ background: '#1e3a5f' }}>Request coaching →</button>
                  : <Link href="/auth/signup" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0" style={{ background: '#1e3a5f' }}>Sign up to hire →</Link>
                : <span className="px-4 py-2.5 rounded-xl text-sm flex-shrink-0" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>Currently full</span>
            }
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="px-4 mb-4">
        <div className="max-w-lg mx-auto flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-surface)' }}>
          {(['about', 'plans', 'reviews'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize"
              style={{ background: activeTab === tab ? '#1e3a5f' : 'transparent', color: activeTab === tab ? 'white' : 'var(--color-text-tertiary)' }}>
              {tab}{tab === 'reviews' && coach.review_count > 0 ? ` (${coach.review_count})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">

        {activeTab === 'about' && (
          <>
            {coach.bio && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>About</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{coach.bio}</p>
              </div>
            )}
            {((coach.specialty_tags?.length ?? 0) > 0 || (coach.distance_tags?.length ?? 0) > 0) && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {[...(coach.distance_tags ?? []), ...(coach.specialty_tags ?? [])].map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: '#1e3a5f30', color: '#7eb8e8' }}>{tag}</span>
                  ))}
                  {(coach.athlete_type_tags ?? []).map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {coach.coach_pbs && Object.keys(coach.coach_pbs).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>Coach PBs</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(coach.coach_pbs).map(([dist, time]) => (
                    <div key={dist} className="rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{dist}</p>
                      <p className="text-sm font-black font-data" style={{ color: 'var(--color-text-primary)' }}>{time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(coach.website_url || coach.instagram_handle || coach.strava_profile) && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>Links</p>
                <div className="space-y-2">
                  {coach.website_url && <a href={coach.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>🌐 {coach.website_url.replace(/^https?:\/\//, '')}</a>}
                  {coach.instagram_handle && <a href={`https://instagram.com/${coach.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>📷 @{coach.instagram_handle}</a>}
                  {coach.strava_profile && <a href={coach.strava_profile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>🏃 Strava profile</a>}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'plans' && (
          plans.length === 0
            ? <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}><p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No plans published yet.</p></div>
            : plans.map(plan => (
              <div key={plan.id} className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${LEVEL_COLOUR[plan.level] ?? '#8b5cf6'}20`, color: LEVEL_COLOUR[plan.level] ?? '#8b5cf6' }}>{plan.level}</span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{plan.distance} · {plan.weeks_min}{plan.weeks_max !== plan.weeks_min ? `–${plan.weeks_max}` : ''} weeks</p>
                {plan.description && <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{plan.description}</p>}
              </div>
            ))
        )}

        {activeTab === 'reviews' && (
          !reviewsLoaded
            ? <div className="py-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}><div className="animate-pulse text-2xl mb-2">⭐</div><p className="text-xs">Loading reviews…</p></div>
            : reviews.length === 0
              ? <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-2xl mb-2">⭐</p>
                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>No reviews yet</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Reviews unlock after 30 days of coaching.</p>
                </div>
              : <div className="space-y-3">{reviews.map(r => <ReviewCard key={r.id} review={r} />)}</div>
        )}
      </div>

      {/* Request sheet */}
      {showRequest && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => !sending && setShowRequest(false)}>
          <div className="rounded-t-3xl p-6 max-w-lg w-full mx-auto" style={{ background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--color-border-2)' }} />
            {requestSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-base font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>Request sent!</p>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{coach.display_name} will be in touch soon.</p>
              </div>
            ) : (
              <>
                <p className="text-base font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>Request coaching from {coach.display_name}</p>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>Tell the coach about your goals, current fitness, and what you're training for.</p>
                <textarea value={requestNote} onChange={e => setRequestNote(e.target.value)}
                  placeholder="e.g. Training for my first marathon in October. Currently running 30km/week..."
                  rows={4} className="w-full rounded-xl px-4 py-3 text-sm resize-none mb-4"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                {coach.rate_monthly_gbp && <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)' }}>From £{coach.rate_monthly_gbp}/month · payment set up after coach accepts</p>}
                <button onClick={sendRequest} disabled={sending || !requestNote.trim()}
                  className="w-full py-4 rounded-2xl font-bold text-sm text-white disabled:opacity-50 transition-all"
                  style={{ background: '#1e3a5f' }}>
                  {sending ? 'Sending…' : 'Send request →'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
