import { NextResponse, NextRequest } from 'next/server'
import { ResetPlanSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = ResetPlanSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { plan_id } = parsed.data
  if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 })

  // Verify the plan belongs to this user
  const { data: plan } = await supabase
    .from('user_plans')
    .select('id, user_id')
    .eq('id', plan_id)
    .eq('user_id', user.id)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await db(supabase)
    .from('user_plans')
    .update({ current_week: 1 })
    .eq('id', plan_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
