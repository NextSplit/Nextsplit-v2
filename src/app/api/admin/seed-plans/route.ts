import { config, serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { db } from '@/lib/supabase/db'

export async function POST(req: Request) {
  // Require a secret header to prevent accidental/unauthorised seeding
  // Always require secret in production
  const secret = serverConfig.seedSecret
  const provided = req.headers.get('x-seed-secret')
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const supabaseUrl = config.supabaseUrl
  const supabaseKey = serverConfig.supabaseServiceRoleKey || config.supabaseAnonKey

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Plans are bundled with the app at build time
  const plansDir = join(process.cwd(), 'plans')
  
  let files: string[]
  try {
    files = readdirSync(plansDir).filter(f => f.endsWith('.json'))
  } catch {
    return NextResponse.json({ error: 'plans/ directory not found' }, { status: 500 })
  }

  const results = []

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(plansDir, file), 'utf8'))
      const { meta, weeks } = raw

      const record = {
        slug: meta.id,
        name: meta.name,
        subtitle: meta.subtitle ?? null,
        distance: meta.distance,
        level: meta.level,
        weeks_min: meta.weeks,
        weeks_max: meta.calendar_flex?.max_weeks ?? meta.weeks,
        runs_per_week: meta.runs_per_week,
        peak_km_week: meta.peak_km_week ?? null,
        longest_run_km: meta.longest_run_km ?? null,
        description: meta.description ?? null,
        meta: meta,
        weeks_data: weeks,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await db(supabase)
        .from('plan_templates')
        .upsert(record, { onConflict: 'slug' })

      results.push({ name: meta.name, status: error ? 'fail' : 'ok', error: error?.message })
    } catch (e) {
      results.push({ name: file, status: 'fail', error: String(e) })
    }
  }

  return NextResponse.json({ results })
}
