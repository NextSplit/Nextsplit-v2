/**
 * Seed plan templates into Supabase.
 *
 * Run from project root:
 *   npx tsx scripts/seed-plans.ts
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY (preferred, bypasses RLS)
 * or falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLANS_DIR = join(__dirname, '../plans')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars. Check .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Seeding plan templates...\n')
  const files = readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'))
  let ok = 0, fail = 0

  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(PLANS_DIR, file), 'utf8'))
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
      meta: {
        goal: meta.goal,
        target_finish_time: meta.target_finish_time,
        tags: meta.tags ?? [],
        calendar_flex: meta.calendar_flex ?? null,
        style: meta.style ?? null,
        training_days: meta.training_days ?? null,
        gym_sessions: meta.gym_sessions ?? 0,
        coach_notes: meta.coach_notes ?? null,
      },
      weeks_data: weeks,
    }

    const { error } = await supabase
      .from('plan_templates')
      .upsert(record, { onConflict: 'slug' })

    if (error) {
      console.error(`  FAIL ${meta.name}: ${error.message}`)
      fail++
    } else {
      console.log(`  OK   ${meta.name.padEnd(38)} ${meta.weeks}wk`)
      ok++
    }
  }

  console.log(`\n  Done: ${ok} seeded, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
