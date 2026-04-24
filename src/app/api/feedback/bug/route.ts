import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { z } from 'zod'
import { zodError } from '@/lib/schemas'

const Schema = z.object({
  message: z.string().min(1).max(2000),
  context: z.string().max(100).optional(),
  url:     z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { message, context, url } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db(supabase).from('bug_reports').insert({
    user_id:    user?.id ?? null,
    message,
    context:    context ?? 'unknown',
    url:        url ?? null,
    user_agent: req.headers.get('user-agent') ?? null,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
