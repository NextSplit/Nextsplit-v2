import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverConfig } from '@/lib/config'
import { buildNotificationEmail } from '@/lib/notificationEmails'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    if (!serverConfig.resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single()

    const email = profile?.email ?? user.email
    if (!email) return NextResponse.json({ error: 'No email found' }, { status: 400 })

    const firstName = (profile?.display_name as string | null)?.split(' ')[0] ?? 'Runner'

    const { Resend } = await import('resend')
    const resend = new Resend(serverConfig.resendApiKey)

    const { subject, html, text } = buildNotificationEmail('streak_at_risk', {
      firstName, email, streakDays: 5,
    })

    const result = await resend.emails.send({
      from: 'Splity at NextSplit <onboarding@resend.dev>',
      to:   email,
      subject: `[TEST] ${subject}`,
      html, text,
    })

    return NextResponse.json({ ok: true, email, subject, resend_id: result.data?.id, error: result.error })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
