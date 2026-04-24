import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { CoachApplySchema, zodError } from '@/lib/schemas'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const rl = checkRateLimit(`coach-apply:${user.id}`, { limit: 3, windowSecs: 3600 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }

    const parsed = CoachApplySchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { display_name, slug, bio, credentials, specialities, location, website_url, instagram_handle, rate_monthly_gbp, tier } = parsed.data

    // Check slug not taken
    const { data: existing } = await db(supabase)
      .from('coach_profiles')
      .select('user_id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'That slug is already taken' }, { status: 409 })
    }

    // Create coach profile
    const { error: profileError } = await db(supabase)
      .from('coach_profiles')
      .insert({
        user_id:          user.id,
        display_name,
        slug,
        bio:              bio || null,
        credentials:      credentials || null,
        specialities:     specialities || [],
        location:         location || null,
        website_url:      website_url || null,
        instagram_handle: instagram_handle || null,
        rate_monthly_gbp: rate_monthly_gbp || null,
        verified:         false,
        accepting_athletes: true,
        max_athletes:     tier === 'split_leader' ? 5 : 20,
      })

    if (profileError) {
      Sentry.captureException(profileError, { extra: { context: 'Coach profile create error:' } })
      return NextResponse.json({ error: 'Failed to create coach profile' }, { status: 500 })
    }

    // Update profiles table with coach status
    await db(supabase).from('profiles').update({
      is_coach:         true,
      coach_tier:       tier ?? 'split_leader',
      coach_applied_at: new Date().toISOString(),
    }).eq('id', user.id)

    return NextResponse.json({ success: true, slug })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coach apply error:' } })
    return NextResponse.json({ error: 'Application failed' }, { status: 500 })
  }
}
