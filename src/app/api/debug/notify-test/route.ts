import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverConfig } from '@/lib/config'
import { buildNotificationEmail } from '@/lib/notificationEmails'

export async function GET(req: NextRequest) {
  try {
    const cronSecret = req.nextUrl.searchParams.get('secret')
    const isSecretAuth = cronSecret && cronSecret === process.env.CRON_SECRET

    let email: string | undefined
    let firstName = 'Runner'

    if (isSecretAuth) {
      // Secret-based auth — use test account directly
      email = 'nextsplitplans@gmail.com'
      firstName = 'Ash'
    } else {
      // Session-based auth
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Not logged in — add ?secret=YOUR_CRON_SECRET to the URL' }, { status: 401 })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .single()

      email = profile?.email ?? user.email
      if (!email) return NextResponse.json({ error: 'No email found' }, { status: 400 })
      firstName = (profile?.display_name as string | null)?.split(' ')[0] ?? 'Runner'
    }

    if (!serverConfig.resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(serverConfig.resendApiKey)

    const { subject, html, text } = buildNotificationEmail('streak_at_risk', {
      firstName, email, streakDays: 5,
    })

    const result = await resend.emails.send({
      from: 'Splity at NextSplit <coach@nextsplit.app>',
      to:   email,
      subject: `[TEST] ${subject}`,
      html, text,
    })

    return NextResponse.json({ ok: true, email, subject, resend_id: result.data?.id, error: result.error })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
