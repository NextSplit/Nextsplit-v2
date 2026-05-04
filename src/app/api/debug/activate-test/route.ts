import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
    if (!adminEmails.includes(user.email ?? '')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    const { data: templates, error: tErr } = await s
      .from('plan_templates')
      .select('id, slug, name, weeks_min')
      .limit(5)

    if (tErr) return NextResponse.json({ error: 'Template query failed', detail: tErr.message })

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const idCheck = (templates ?? []).map((t: { id: string; slug: string; name: string }) => ({
      slug: t.slug, id: t.id, isValidUUID: uuidRegex.test(t.id ?? ''),
    }))

    // Test a sample activate payload
    const firstTemplate = templates?.[0]
    const testPayload = firstTemplate ? {
      template_id: firstTemplate.id,
      name: firstTemplate.name,
      include_gym: true,
    } : null

    return NextResponse.json({
      templateCount: templates?.length ?? 0,
      samples: idCheck,
      samplePayload: testPayload,
      userEmail: user.email,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) })
  }
}
