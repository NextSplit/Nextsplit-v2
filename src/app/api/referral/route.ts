import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReferralCode, buildReferralUrl } from '@/lib/referral'
import { ReferralCodeSchema, zodError } from '@/lib/schemas'

/**
 * GET  /api/referral       — get current user's referral code (creates if missing)
 * POST /api/referral       — validate a referral code (called on signup)
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Check if user already has a code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('referral_code, referral_count, display_name')
      .eq('id', user.id)
      .single()

    let code = profile?.referral_code as string | null

    if (!code) {
      // Generate and store
      code = generateReferralCode(user.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', user.id)
    }

    return NextResponse.json({
      code,
      shareUrl:       buildReferralUrl(code),
      referralCount:  profile?.referral_count ?? 0,
      displayName:    profile?.display_name ?? null,
    })
  } catch (err) {
    console.error('[referral GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = ReferralCodeSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { code } = parsed.data
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'code required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Find the referrer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referrer } = await (supabase as any)
      .from('profiles')
      .select('id, display_name')
      .eq('referral_code', code.toUpperCase())
      .single()

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Don't allow self-referral
    if (referrer.id === user.id) {
      return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
    }

    // Check if this user was already referred
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('profiles')
      .select('referred_by')
      .eq('id', user.id)
      .single()

    if (existing?.referred_by) {
      return NextResponse.json({ error: 'Already referred' }, { status: 400 })
    }

    // Store referral relationship
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', user.id)

    return NextResponse.json({
      ok:           true,
      referrerName: (referrer.display_name as string | null)?.split(' ')[0] ?? 'A friend',
    })
  } catch (err) {
    console.error('[referral POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
