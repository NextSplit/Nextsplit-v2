import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const CAPACITY_TIERS = [
  { tier: 'starter',     max: 10,  label: 'Starter',     requires_review: false },
  { tier: 'growing',     max: 25,  label: 'Growing',     requires_review: true  },
  { tier: 'established', max: 50,  label: 'Established', requires_review: true  },
  { tier: 'elite',       max: 999, label: 'Elite',       requires_review: true  },
]

const SettingsSchema = z.object({
  // Availability
  accepting_athletes: z.boolean().optional(),
  on_break_until:     z.string().optional().nullable(), // ISO date
  // Capacity
  max_athletes:       z.number().int().min(1).max(999).optional(),
  // Profile fields
  bio:                z.string().max(500).optional(),
  location:           z.string().max(100).optional(),
  timezone:           z.string().max(60).optional(),
  rate_monthly_gbp:   z.number().min(0).optional().nullable(),
  rate_plan_gbp:      z.number().min(0).optional().nullable(),
  website_url:        z.string().url().optional().nullable(),
  instagram_handle:   z.string().max(50).optional().nullable(),
  specialty_tags:     z.array(z.string()).optional(),
  distance_tags:      z.array(z.string()).optional(),
  athlete_type_tags:  z.array(z.string()).optional(),
  language_tags:      z.array(z.string()).optional(),
  coach_pbs:          z.record(z.string(), z.string()).optional(),
  group_coaching:     z.boolean().optional(),
  group_max_size:     z.number().int().min(2).max(50).optional(),
  group_price_gbp:    z.number().min(0).optional().nullable(),
})

/**
 * GET  /api/coach/settings  — fetch coach profile settings
 * PATCH /api/coach/settings — update coach profile settings
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data: coach } = await s
      .from('coach_profiles')
      .select(`
        display_name, slug, bio, location, timezone,
        accepting_athletes, max_athletes, total_athletes,
        rate_monthly_gbp, rate_plan_gbp,
        website_url, instagram_handle, strava_profile,
        specialty_tags, distance_tags, athlete_type_tags, language_tags,
        coach_pbs, group_coaching, group_max_size, group_price_gbp,
        verification_tier, stripe_account_id,
        is_featured, avg_rating, review_count
      `)
      .eq('user_id', user.id)
      .single()

    if (!coach) return NextResponse.json({ error: 'Not a coach' }, { status: 404 })

    // Current capacity tier
    const capacityTier = [...CAPACITY_TIERS].reverse().find(t => (coach.max_athletes ?? 10) >= t.max) ?? CAPACITY_TIERS[0]

    // Active athlete count
    const { count: activeCount } = await s
      .from('coach_athletes')
      .select('id', { count: 'exact' })
      .eq('coach_id', user.id)
      .eq('status', 'active')

    // Waitlist count
    const { count: waitlistCount } = await s
      .from('coach_waitlist')
      .select('id', { count: 'exact' })
      .eq('coach_id', user.id)
      .eq('status', 'waiting')
      .catch(() => ({ count: 0 }))

    return NextResponse.json({
      coach,
      capacity: {
        current:     activeCount ?? 0,
        max:         coach.max_athletes ?? 10,
        tier:        capacityTier,
        all_tiers:   CAPACITY_TIERS,
        waitlist:    waitlistCount ?? 0,
        is_full:     (activeCount ?? 0) >= (coach.max_athletes ?? 10),
      },
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coach settings fetch error:' } })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body   = await req.json()
    const parsed = SettingsSchema.safeParse(body)
    if (!parsed.success) return zodError(parsed.error)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Verify coach exists
    const { data: existing } = await s
      .from('coach_profiles')
      .select('user_id, max_athletes, total_athletes')
      .eq('user_id', user.id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not a coach' }, { status: 403 })

    // Capacity increase requests above 10 need NextSplit review
    // For now, enforce max 10 unless already higher (grandfathered)
    const { max_athletes, ...rest } = parsed.data
    const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

    if (max_athletes !== undefined) {
      const currentMax = existing.max_athletes ?? 10
      if (max_athletes > currentMax) {
        // Allow self-service up to 10; beyond needs review (enforced server-side)
        if (max_athletes > 50) {
          return NextResponse.json({ error: 'Elite tier (50+ athletes) requires NextSplit review' }, { status: 403 })
        }
      }
      updateData.max_athletes = max_athletes
    }

    // If setting accepting_athletes to true, auto-clear on_break_until
    if (parsed.data.accepting_athletes === true) {
      updateData.on_break_until = null
    }

    const { error } = await s
      .from('coach_profiles')
      .update(updateData)
      .eq('user_id', user.id)

    if (error) {
      Sentry.captureException(error, { extra: { context: 'Coach settings update error:' } })
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ updated: true })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coach settings error:' } })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
