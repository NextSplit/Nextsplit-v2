'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CoachData {
  display_name: string
  slug: string
  bio: string | null
  location: string | null
  timezone: string | null
  accepting_athletes: boolean
  max_athletes: number
  total_athletes: number
  rate_monthly_gbp: number | null
  rate_plan_gbp: number | null
  website_url: string | null
  instagram_handle: string | null
  specialty_tags: string[]
  distance_tags: string[]
  athlete_type_tags: string[]
  group_coaching: boolean
  group_max_size: number | null
  group_price_gbp: number | null
  verification_tier: string
  stripe_account_id: string | null
  avg_rating: number
  review_count: number
}

interface Props {
  coach:          CoachData
  activeAthletes: number
  userId:         string
}

const SPECIALTY_OPTS = ['Marathon', 'Half Marathon', '10K', '5K', 'Trail', 'Ultra', 'Track', 'Cross Country', 'Triathlon', 'Obstacle']
const DISTANCE_OPTS  = ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Trail', 'Multi-distance']
const ATHLETE_OPTS   = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'Masters', 'Youth', 'Female', 'Male']
const CAPACITY_TIERS = [
  { label: 'Starter',     max: 10,  desc: 'Up to 10 athletes — self-service'      },
  { label: 'Growing',     max: 25,  desc: 'Up to 25 athletes — requires review'    },
  { label: 'Established', max: 50,  desc: 'Up to 50 athletes — requires review'    },
  { label: 'Elite',       max: 999, desc: '50+ athletes — NextSplit approval only' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{title}</p>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, label, sub }: { value: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
        {sub && <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className="w-10 h-6 rounded-full transition-all relative flex-shrink-0 ml-3"
        style={{ background: value ? '#2b5c3f' : 'var(--color-surface-2)' }}>
        <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: value ? '1.25rem' : '0.25rem' }} />
      </button>
    </div>
  )
}

export default function CoachSettingsClient({ coach, activeAthletes }: Props) {
  // Availability state
  const [accepting, setAccepting]     = useState(coach.accepting_athletes)
  const [maxAthletes, setMaxAthletes] = useState(coach.max_athletes ?? 10)

  // Profile state
  const [bio, setBio]             = useState(coach.bio ?? '')
  const [location, setLocation]   = useState(coach.location ?? '')
  const [timezone, setTimezone]   = useState(coach.timezone ?? '')
  const [rateMonthly, setRateMonthly] = useState(coach.rate_monthly_gbp?.toString() ?? '')
  const [ratePlan, setRatePlan]   = useState(coach.rate_plan_gbp?.toString() ?? '')
  const [website, setWebsite]     = useState(coach.website_url ?? '')
  const [instagram, setInstagram] = useState(coach.instagram_handle ?? '')
  const [groupCoaching, setGroupCoaching] = useState(coach.group_coaching)
  const [groupMax, setGroupMax]   = useState(coach.group_max_size?.toString() ?? '10')
  const [groupPrice, setGroupPrice] = useState(coach.group_price_gbp?.toString() ?? '')

  // Tag state
  const [specialtyTags, setSpecialtyTags]   = useState<string[]>(coach.specialty_tags ?? [])
  const [distanceTags, setDistanceTags]     = useState<string[]>(coach.distance_tags ?? [])
  const [athleteTypeTags, setAthleteTypeTags] = useState<string[]>(coach.athlete_type_tags ?? [])

  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const isFull      = activeAthletes >= maxAthletes
  const capacityPct = Math.min(100, Math.round((activeAthletes / maxAthletes) * 100))

  function toggleTag(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag])
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/coach/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepting_athletes: accepting,
          max_athletes:       maxAthletes,
          bio:                bio || null,
          location:           location || null,
          timezone:           timezone || null,
          rate_monthly_gbp:   rateMonthly ? parseFloat(rateMonthly) : null,
          rate_plan_gbp:      ratePlan ? parseFloat(ratePlan) : null,
          website_url:        website || null,
          instagram_handle:   instagram || null,
          group_coaching:     groupCoaching,
          group_max_size:     groupMax ? parseInt(groupMax) : null,
          group_price_gbp:    groupPrice ? parseFloat(groupPrice) : null,
          specialty_tags:     specialtyTags,
          distance_tags:      distanceTags,
          athlete_type_tags:  athleteTypeTags,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const inp = "w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  const inpSty = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }

  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-4 sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/coach/squad" className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-surface)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-display text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>
              Coach Settings
            </h1>
          </div>
          <button onClick={save} disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 active:scale-95"
            style={{ background: saved ? '#059669' : '#2b5c3f' }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#e85d2620', color: '#e85d26' }}>
            {error}
          </div>
        )}

        {/* Stripe warning */}
        {!coach.stripe_account_id && (
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid #e85d2640' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#e85d26' }}>⚠️ Payments not connected</p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Connect Stripe to receive athlete payments.
            </p>
            <button onClick={async () => {
              const res = await fetch('/api/stripe/connect', { method: 'POST' })
              const d = await res.json()
              if (d.url) window.location.href = d.url
            }} className="text-xs px-4 py-2 rounded-xl font-bold text-white" style={{ background: '#e85d26' }}>
              Connect Stripe →
            </button>
          </div>
        )}

        {/* Availability */}
        <Section title="Availability">
          <Toggle
            value={accepting}
            onChange={setAccepting}
            label={accepting ? 'Taking new athletes' : 'Closed to new athletes'}
            sub={accepting ? 'Your profile shows as available' : 'Athletes see "currently full"'}
          />
          {!accepting && (
            <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--color-surface-2)' }}>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                While closed, athletes can still view your profile but cannot request coaching.
              </p>
            </div>
          )}
        </Section>

        {/* Capacity */}
        <Section title="Athlete capacity">
          {/* Current usage */}
          <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {activeAthletes} / {maxAthletes} athletes
              </p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isFull ? '#e85d2620' : '#2b5c3f20',
                  color:      isFull ? '#e85d26' : '#4ade80',
                }}>
                {isFull ? 'Full' : `${maxAthletes - activeAthletes} slots open`}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-3)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${capacityPct}%`, background: isFull ? '#e85d26' : '#2b5c3f' }} />
            </div>
          </div>

          {/* Tier selector */}
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Max athletes</p>
          <div className="space-y-2">
            {CAPACITY_TIERS.map(tier => {
              const isActive   = maxAthletes === tier.max || (tier.max === 999 && maxAthletes > 50)
              const isLocked   = tier.max > 10
              return (
                <button key={tier.label}
                  onClick={() => !isLocked && setMaxAthletes(tier.max)}
                  disabled={isLocked}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all text-left"
                  style={{
                    background: isActive ? '#2b5c3f20' : 'var(--color-surface-2)',
                    border: `1px solid ${isActive ? '#2b5c3f60' : 'transparent'}`,
                    opacity: isLocked && !isActive ? 0.5 : 1,
                  }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {tier.label} {isActive && '✓'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{tier.desc}</p>
                  </div>
                  <span className="text-xs font-data font-bold" style={{ color: isActive ? '#4ade80' : 'var(--color-text-tertiary)' }}>
                    {tier.max === 999 ? '50+' : tier.max}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Tiers above 10 athletes require NextSplit review. Contact support to unlock.
          </p>
        </Section>

        {/* Pricing */}
        <Section title="Pricing">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Monthly coaching (£)</p>
              <input value={rateMonthly} onChange={e => setRateMonthly(e.target.value)} type="number" min="0" placeholder="e.g. 79.99" className={`${inp} font-data`} style={inpSty} />
            </div>
            <div>
              <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>One-off plan (£)</p>
              <input value={ratePlan} onChange={e => setRatePlan(e.target.value)} type="number" min="0" placeholder="e.g. 29.99" className={`${inp} font-data`} style={inpSty} />
            </div>
          </div>
          <Toggle
            value={groupCoaching}
            onChange={setGroupCoaching}
            label="Group coaching"
            sub="Offer group plans at a lower per-athlete price"
          />
          {groupCoaching && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Group price /person (£)</p>
                <input value={groupPrice} onChange={e => setGroupPrice(e.target.value)} type="number" min="0" placeholder="e.g. 19.99" className={`${inp} font-data`} style={inpSty} />
              </div>
              <div>
                <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Max group size</p>
                <input value={groupMax} onChange={e => setGroupMax(e.target.value)} type="number" min="2" max="50" className={`${inp} font-data`} style={inpSty} />
              </div>
            </div>
          )}
        </Section>

        {/* About */}
        <Section title="About you">
          <div>
            <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Bio (max 500 chars)</p>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500}
              placeholder="Tell athletes about your coaching philosophy, experience, and what makes you unique…"
              className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
              style={inpSty} />
            <p className="text-[10px] text-right mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{bio.length}/500</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Location</p>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. London, UK" className={inp} style={inpSty} />
            </div>
            <div>
              <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Timezone</p>
              <input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g. Europe/London" className={inp} style={inpSty} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Website</p>
              <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://…" className={inp} style={inpSty} />
            </div>
            <div>
              <p className="text-[10px] mb-1 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Instagram</p>
              <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" className={inp} style={inpSty} />
            </div>
          </div>
        </Section>

        {/* Specialties */}
        <Section title="Specialties">
          <div>
            <p className="text-[10px] mb-2 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Distance specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {DISTANCE_OPTS.map(tag => (
                <button key={tag} onClick={() => toggleTag(distanceTags, setDistanceTags, tag)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: distanceTags.includes(tag) ? '#1e3a5f' : 'var(--color-surface-2)',
                    color:      distanceTags.includes(tag) ? '#7eb8e8' : 'var(--color-text-secondary)',
                  }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Coaching style</p>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTY_OPTS.map(tag => (
                <button key={tag} onClick={() => toggleTag(specialtyTags, setSpecialtyTags, tag)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: specialtyTags.includes(tag) ? '#1e3a5f' : 'var(--color-surface-2)',
                    color:      specialtyTags.includes(tag) ? '#7eb8e8' : 'var(--color-text-secondary)',
                  }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2 font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Athlete types</p>
            <div className="flex flex-wrap gap-1.5">
              {ATHLETE_OPTS.map(tag => (
                <button key={tag} onClick={() => toggleTag(athleteTypeTags, setAthleteTypeTags, tag)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: athleteTypeTags.includes(tag) ? '#1e3a5f' : 'var(--color-surface-2)',
                    color:      athleteTypeTags.includes(tag) ? '#7eb8e8' : 'var(--color-text-secondary)',
                  }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Quick links */}
        <Section title="More">
          {[
            { href: '/coach/earnings', label: '💰 Earnings dashboard', sub: 'Revenue, commission, payouts' },
            { href: '/coach/plan-builder', label: '📋 Plan builder', sub: 'Create and publish training plans' },
            { href: `/coach/${coach.slug}`, label: '👤 View public profile', sub: 'See your profile as athletes see it' },
          ].map(link => (
            <a key={link.href} href={link.href}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{link.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{link.sub}</p>
              </div>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                style={{ color: 'var(--color-text-tertiary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </Section>
      </div>
    </main>
  )
}
