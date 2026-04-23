'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Coach {
  user_id: string
  display_name: string
  slug: string
  bio: string | null
  photo_url: string | null
  location: string | null
  specialty_tags: string[]
  distance_tags: string[]
  rate_monthly_gbp: number | null
  rate_plan_gbp: number | null
  avg_rating: number
  review_count: number
  total_athletes: number
  verified: boolean
  verification_tier: string
  is_featured: boolean
  accepting_athletes: boolean
  group_coaching: boolean
  group_price_gbp: number | null
}

interface Props {
  initialCoaches: Coach[]
  viewerLoggedIn: boolean
  activeCoachId: string | null
}

const SPECIALTY_OPTIONS = ['Marathon', 'Half Marathon', '10K', '5K', 'Trail', 'Ultra', 'Track', 'Cross Country']
const DISTANCE_OPTIONS  = ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Trail']
const PRICE_OPTIONS     = [
  { label: 'Any price', value: '' },
  { label: 'Under £50', value: '50' },
  { label: 'Under £100', value: '100' },
  { label: 'Under £150', value: '150' },
]

function StarRating({ rating, count }: { rating: number; count: number }) {
  const stars = Math.round(rating)
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1,2,3,4,5].map(i => (
          <svg key={i} className="w-3 h-3" viewBox="0 0 20 20" fill={i <= stars ? '#c49a3c' : 'none'}
            stroke={i <= stars ? '#c49a3c' : '#5a8a6a'} strokeWidth={1.5}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        ))}
      </div>
      <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>
        {rating > 0 ? rating.toFixed(1) : '–'} {count > 0 ? `(${count})` : '(no reviews yet)'}
      </span>
    </div>
  )
}

function CoachCard({ coach, isActive }: { coach: Coach; isActive: boolean }) {
  const colour = '#8b5cf6'

  return (
    <Link href={`/coach/${coach.slug}`}
      className="block rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
      style={{ background: 'var(--color-surface)', border: `1px solid ${isActive ? '#c49a3c60' : 'var(--color-border)'}` }}>

      {/* Featured banner */}
      {coach.is_featured && (
        <div className="px-4 py-1.5 text-center text-[10px] font-black tracking-wider"
          style={{ background: '#c49a3c', color: '#0f1a14' }}>
          ⭐ FEATURED COACH
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Photo */}
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
            style={{ background: 'var(--color-surface-2)' }}>
            {coach.photo_url ? (
              <Image src={coach.photo_url} alt={coach.display_name} width={56} height={56}
                className="w-full h-full object-cover" />
            ) : '🏃'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {coach.display_name}
                  </p>
                  {coach.verification_tier === 'credential_verified' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: '#8b5cf630', color: '#4ade80' }}>
                      ✅ Verified
                    </span>
                  )}
                  {coach.verification_tier === 'elite' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: '#c49a3c30', color: '#c49a3c' }}>
                      ⭐ Elite
                    </span>
                  )}
                </div>
                {coach.location && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    📍 {coach.location}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                {coach.rate_monthly_gbp ? (
                  <>
                    <p className="text-sm font-black" style={{ color: colour }}>
                      £{coach.rate_monthly_gbp}
                    </p>
                    <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>/month</p>
                  </>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>POA</p>
                )}
              </div>
            </div>

            {/* Rating */}
            <div className="mt-1.5">
              <StarRating rating={coach.avg_rating} count={coach.review_count} />
            </div>
          </div>
        </div>

        {/* Bio */}
        {coach.bio && (
          <p className="text-xs mt-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
            {coach.bio}
          </p>
        )}

        {/* Tags */}
        {(coach.specialty_tags?.length > 0 || coach.distance_tags?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[...( coach.distance_tags ?? []), ...(coach.specialty_tags ?? [])].slice(0, 4).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex gap-3">
            <div>
              <p className="text-xs font-bold font-data" style={{ color: 'var(--color-text-primary)' }}>
                {coach.total_athletes}
              </p>
              <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>athletes</p>
            </div>
            {coach.group_coaching && (
              <div>
                <p className="text-xs font-bold" style={{ color: '#c49a3c' }}>Group</p>
                <p className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {coach.group_price_gbp ? `£${coach.group_price_gbp}/mo` : 'available'}
                </p>
              </div>
            )}
          </div>

          {isActive ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: '#c49a3c20', color: '#c49a3c' }}>
              Your coach
            </span>
          ) : coach.accepting_athletes ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: '#8b5cf620', color: '#4ade80' }}>
              Taking athletes
            </span>
          ) : (
            <span className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
              Full
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function CoachesBrowseClient({ initialCoaches, viewerLoggedIn, activeCoachId }: Props) {
  const [coaches, setCoaches]           = useState<Coach[]>(initialCoaches)
  const [specialty, setSpecialty]       = useState('')
  const [distance, setDistance]         = useState('')
  const [maxPrice, setMaxPrice]         = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [showFilters, setShowFilters]   = useState(false)
  const [isPending, startTransition]    = useTransition()

  async function applyFilters(overrides?: Partial<{
    specialty: string; distance: string; maxPrice: string; verifiedOnly: boolean
  }>) {
    const sp = overrides?.specialty     ?? specialty
    const di = overrides?.distance      ?? distance
    const mp = overrides?.maxPrice      ?? maxPrice
    const vo = overrides?.verifiedOnly  ?? verifiedOnly

    startTransition(async () => {
      const params = new URLSearchParams()
      if (sp) params.set('specialty', sp)
      if (di) params.set('distance', di)
      if (mp) params.set('max_price', mp)
      if (vo) params.set('verified_only', 'true')

      const res  = await fetch(`/api/coaches?${params}`)
      const data = await res.json()
      setCoaches(data.coaches ?? [])
    })
  }

  function clearFilters() {
    setSpecialty(''); setDistance(''); setMaxPrice(''); setVerifiedOnly(false)
    setCoaches(initialCoaches)
  }

  const activeFilters = [specialty, distance, maxPrice, verifiedOnly].filter(Boolean).length

  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-4 sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              Find a Coach
            </h1>
            <button onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: activeFilters > 0 ? '#8b5cf630' : 'var(--color-surface)',
                color:      activeFilters > 0 ? '#4ade80' : 'var(--color-text-secondary)',
                border:     `1px solid ${activeFilters > 0 ? '#8b5cf660' : 'var(--color-border)'}`,
              }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
              </svg>
              Filters {activeFilters > 0 && `(${activeFilters})`}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="rounded-2xl p-4 mb-3 space-y-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

              {/* Specialty */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--color-text-tertiary)' }}>Specialty</p>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTY_OPTIONS.map(opt => (
                    <button key={opt}
                      onClick={() => { const v = specialty === opt ? '' : opt; setSpecialty(v); applyFilters({ specialty: v }) }}
                      className="text-xs px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: specialty === opt ? '#8b5cf6' : 'var(--color-surface-2)',
                        color:      specialty === opt ? 'white' : 'var(--color-text-secondary)',
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--color-text-tertiary)' }}>Distance</p>
                <div className="flex flex-wrap gap-1.5">
                  {DISTANCE_OPTIONS.map(opt => (
                    <button key={opt}
                      onClick={() => { const v = distance === opt ? '' : opt; setDistance(v); applyFilters({ distance: v }) }}
                      className="text-xs px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: distance === opt ? '#8b5cf6' : 'var(--color-surface-2)',
                        color:      distance === opt ? 'white' : 'var(--color-text-secondary)',
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--color-text-tertiary)' }}>Max price/month</p>
                <div className="flex gap-1.5">
                  {PRICE_OPTIONS.map(opt => (
                    <button key={opt.value}
                      onClick={() => { setMaxPrice(opt.value); applyFilters({ maxPrice: opt.value }) }}
                      className="text-xs px-2.5 py-1 rounded-full transition-all flex-1"
                      style={{
                        background: maxPrice === opt.value ? '#8b5cf6' : 'var(--color-surface-2)',
                        color:      maxPrice === opt.value ? 'white' : 'var(--color-text-secondary)',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verified toggle */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Verified coaches only
                </p>
                <button onClick={() => { const v = !verifiedOnly; setVerifiedOnly(v); applyFilters({ verifiedOnly: v }) }}
                  className="w-10 h-6 rounded-full transition-all relative"
                  style={{ background: verifiedOnly ? '#8b5cf6' : 'var(--color-surface-2)' }}>
                  <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: verifiedOnly ? '1.25rem' : '0.25rem' }} />
                </button>
              </div>

              {activeFilters > 0 && (
                <button onClick={clearFilters}
                  className="text-xs w-full py-2 rounded-xl"
                  style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-surface-2)' }}>
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Coach list */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {isPending ? (
          <div className="py-16 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            <div className="text-3xl mb-3 animate-pulse">🔍</div>
            <p className="text-sm">Finding coaches…</p>
          </div>
        ) : coaches.length === 0 ? (
          <div className="py-16 text-center rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-3xl mb-3">🏃</div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              No coaches match your filters
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Try widening your search
            </p>
            <button onClick={clearFilters}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#8b5cf6' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs pb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {coaches.length} coach{coaches.length !== 1 ? 'es' : ''} available
            </p>
            {coaches.map(coach => (
              <CoachCard
                key={coach.user_id}
                coach={coach}
                isActive={coach.user_id === activeCoachId}
              />
            ))}

            {!viewerLoggedIn && (
              <div className="rounded-2xl p-5 text-center mt-2"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Sign in to hire a coach
                </p>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Create a free account to view coach profiles and request coaching.
                </p>
                <a href="/auth/signup"
                  className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: '#8b5cf6' }}>
                  Get started free →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
