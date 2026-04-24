import * as Sentry from '@sentry/nextjs'
import { config } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await db(supabase)
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${config.siteUrl}/profile`,
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Portal error:' } })
    return NextResponse.json({ error: 'Portal failed' }, { status: 500 })
  }
}
