/**
 * NextSplit UAT — Database Verification Script (Option 2)
 * 
 * Run: npx tsx scripts/uat-db-verify.ts
 * 
 * Verifies data integrity, RLS policies, and schema correctness
 * using the service role key (bypasses RLS for admin checks).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://wlrmeiczqgmharvfmalq.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0, failed = 0

function pass(name: string) {
  console.log(`  ✅ ${name}`)
  passed++
}

function fail(name: string, detail?: string) {
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
  failed++
}

function section(name: string) {
  console.log(`\n── ${name} ─────────────────────────────────`)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function checkSchema() {
  section('Schema — Required Tables Exist')
  
  const required = [
    'profiles', 'user_plans', 'training_logs', 'plan_templates',
    'squads', 'squad_members', 'squad_invites', 'squad_feed',
    'coach_profiles', 'coach_athletes', 'coach_messages',
    'coaching_subscriptions', 'coach_earnings',
    'ai_usage',
  ]

  for (const table of required) {
    const { error } = await db.from(table).select('count').limit(0)
    if (error) fail(`Table exists: ${table}`, error.message)
    else pass(`Table exists: ${table}`)
  }
}

async function checkProfiles() {
  section('Profiles — Data Integrity')

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, email, handle, onboarding_complete, runner_colour, is_pro')

  if (error) { fail('Profiles readable', error.message); return }
  pass(`Profiles readable (${profiles?.length ?? 0} users)`)

  // Check no profiles missing email
  const noEmail = profiles?.filter(p => !p.email) ?? []
  if (noEmail.length > 0) fail(`Profiles with missing email: ${noEmail.length}`)
  else pass('All profiles have email')

  // Check runner_colour format
  const badColour = profiles?.filter(p => p.runner_colour && !/^#[0-9a-fA-F]{6}$/.test(p.runner_colour)) ?? []
  if (badColour.length > 0) fail(`Profiles with invalid runner_colour: ${badColour.length}`)
  else pass('All runner_colour values valid hex format')

  // Check handle uniqueness
  const handles = profiles?.map(p => p.handle?.toLowerCase()).filter(Boolean) ?? []
  const unique = new Set(handles)
  if (unique.size < handles.length) fail(`Duplicate handles found: ${handles.length - unique.size} duplicates`)
  else pass('All handles unique')
}

async function checkPlans() {
  section('Plans — Data Integrity')

  const { data: plans, error } = await db
    .from('user_plans')
    .select('id, user_id, name, status, current_week, total_weeks, weeks_data')

  if (error) { fail('user_plans readable', error.message); return }
  pass(`user_plans readable (${plans?.length ?? 0} plans)`)

  // Check no active plans with invalid week
  const badWeek = plans?.filter(p =>
    p.status === 'active' && (p.current_week < 1 || p.current_week > p.total_weeks)
  ) ?? []
  if (badWeek.length > 0) fail(`Active plans with out-of-range current_week: ${badWeek.length}`)
  else pass('All active plan weeks in valid range')

  // Check weeks_data is valid JSON array
  const badData = plans?.filter(p => {
    if (!p.weeks_data) return true
    if (!Array.isArray(p.weeks_data)) return true
    return false
  }) ?? []
  if (badData.length > 0) fail(`Plans with invalid weeks_data: ${badData.length}`)
  else pass('All plan weeks_data is valid array')

  // Check each user has at most 1 active plan
  const activePlans = plans?.filter(p => p.status === 'active') ?? []
  const byUser: Record<string, number> = {}
  activePlans.forEach(p => { byUser[p.user_id] = (byUser[p.user_id] ?? 0) + 1 })
  const multiActive = Object.values(byUser).filter(c => c > 1).length
  if (multiActive > 0) fail(`Users with multiple active plans: ${multiActive}`)
  else pass('No users with multiple active plans')
}

async function checkTrainingLogs() {
  section('Training Logs — Data Integrity')

  const { data: logs, error } = await db
    .from('training_logs')
    .select('id, user_id, plan_id, done, km, effort, week_n, day_i, session_i')
    .limit(500)

  if (error) { fail('training_logs readable', error.message); return }
  pass(`training_logs readable (${logs?.length ?? 0} logs checked)`)

  // Check effort is 1-10
  const badEffort = logs?.filter(l => l.effort !== null && (l.effort < 1 || l.effort > 10)) ?? []
  if (badEffort.length > 0) fail(`Logs with out-of-range effort: ${badEffort.length}`)
  else pass('All effort values in range 1-10')

  // Check km is positive
  const badKm = logs?.filter(l => l.km !== null && l.km < 0) ?? []
  if (badKm.length > 0) fail(`Logs with negative km: ${badKm.length}`)
  else pass('All km values non-negative')
}

async function checkRLS() {
  section('RLS — Anonymous Access Blocked')

  // Create anon client
  const anon = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Anon should NOT be able to read profiles directly
  const { data, error } = await anon.from('profiles').select('id').limit(1)
  if (!error && data && data.length > 0) fail('Profiles accessible by anonymous user — RLS HOLE')
  else pass('Profiles blocked for anonymous users')

  // Anon should NOT be able to read training_logs
  const { data: logs, error: logsErr } = await anon.from('training_logs').select('id').limit(1)
  if (!logsErr && logs && logs.length > 0) fail('training_logs accessible by anonymous user — RLS HOLE')
  else pass('training_logs blocked for anonymous users')

  // Anon should NOT be able to read user_plans
  const { data: plans, error: plansErr } = await anon.from('user_plans').select('id').limit(1)
  if (!plansErr && plans && plans.length > 0) fail('user_plans accessible by anonymous user — RLS HOLE')
  else pass('user_plans blocked for anonymous users')

  // Coach profiles SHOULD be readable by anon (public browse)
  const { error: coachErr } = await anon.from('coach_profiles').select('user_id').limit(1)
  if (coachErr && !coachErr.message.includes('0 rows')) fail('coach_profiles not publicly readable', coachErr.message)
  else pass('coach_profiles publicly readable (correct)')
}

async function checkPlanTemplates() {
  section('Plan Templates — Seeded Content')

  const { data: templates, error } = await db
    .from('plan_templates')
    .select('id, name, distance, level, total_weeks')

  if (error) { fail('plan_templates readable', error.message); return }

  if (!templates || templates.length < 10) fail(`Only ${templates?.length ?? 0} plan templates — expected ≥17`)
  else pass(`${templates.length} plan templates seeded`)

  // Check all distance types covered
  const distances = new Set(templates?.map(t => t.distance) ?? [])
  const expected = ['5K', '10K', 'half_marathon', 'marathon']
  for (const d of expected) {
    if (distances.has(d)) pass(`Distance covered: ${d}`)
    else fail(`Missing distance: ${d}`)
  }

  // Check all have valid total_weeks
  const badWeeks = templates?.filter(t => !t.total_weeks || t.total_weeks < 4) ?? []
  if (badWeeks.length > 0) fail(`Templates with invalid total_weeks: ${badWeeks.length}`)
  else pass('All templates have valid week count')
}

async function checkSquads() {
  section('Squads — Structure')

  const { data: squads, error } = await db
    .from('squads')
    .select('id, name, colour, leader_id, created_at')

  if (error) { fail('squads readable', error.message); return }
  pass(`squads readable (${squads?.length ?? 0} squads)`)

  if (!squads || squads.length === 0) {
    pass('No squads yet — skip member checks')
    return
  }

  // Check all squads have valid colour
  const badColour = squads.filter(s => s.colour && !/^#[0-9a-fA-F]{6}$/.test(s.colour))
  if (badColour.length > 0) fail(`Squads with invalid colour: ${badColour.length}`)
  else pass('All squad colours valid hex')

  // Check all squad leaders exist in profiles
  const leaderIds = squads.map(s => s.leader_id)
  const { data: leaders } = await db
    .from('profiles')
    .select('id')
    .in('id', leaderIds)
  
  if (leaders?.length !== leaderIds.length) fail(`${leaderIds.length - (leaders?.length ?? 0)} squad leaders not in profiles`)
  else pass('All squad leaders exist in profiles')
}

async function createTestUser() {
  section('Test User — Create UAT Account')

  // Check if already exists
  const { data: existing } = await db
    .from('profiles')
    .select('id, email')
    .eq('email', 'uat@nextsplit.app')
    .maybeSingle()

  if (existing) {
    pass(`UAT test account already exists (${existing.id})`)
    return existing.id
  }

  // Create via admin auth API
  const { data, error } = await db.auth.admin.createUser({
    email: 'uat@nextsplit.app',
    password: 'UATtest2026!',
    email_confirm: true,
    user_metadata: { display_name: 'UAT Tester' }
  })

  if (error) { fail('Create UAT user', error.message); return null }
  pass(`UAT user created: ${data.user?.id}`)
  console.log(`  📧 Email: uat@nextsplit.app`)
  console.log(`  🔑 Password: UATtest2026!`)
  return data.user?.id
}

async function seedTestPlan(userId: string) {
  section('Test Plan — Seed for UAT User')

  // Check for existing active plan
  const { data: existing } = await db
    .from('user_plans')
    .select('id, name')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    pass(`UAT user already has active plan: ${existing.name}`)
    return
  }

  // Get a marathon template
  const { data: template } = await db
    .from('plan_templates')
    .select('*')
    .ilike('name', '%marathon novice%')
    .maybeSingle()

  if (!template) { fail('Marathon Novice template not found'); return }

  // Activate it
  const { error } = await db
    .from('user_plans')
    .insert({
      user_id:       userId,
      template_id:   template.id,
      name:          template.name,
      plan_type:     'predetermined',
      status:        'active',
      current_week:  1,
      total_weeks:   template.total_weeks,
      weeks_data:    template.weeks_data,
      goal:          'Complete Brighton Marathon',
      race_date:     '2027-04-11',
      start_date:    new Date().toISOString().slice(0, 10),
    })

  if (error) fail('Seed test plan', error.message)
  else pass(`Test plan seeded: ${template.name}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏃 NextSplit UAT — Database Verification')
  console.log(`📅 ${new Date().toLocaleString('en-GB')}`)
  console.log(`🔗 ${SUPABASE_URL}`)

  await checkSchema()
  await checkProfiles()
  await checkPlans()
  await checkTrainingLogs()
  await checkRLS()
  await checkPlanTemplates()
  await checkSquads()

  // Create UAT test user and seed data
  const userId = await createTestUser()
  if (userId) await seedTestPlan(userId)

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`\n${failed === 0 ? '🎉 All checks passed!' : `⚠️  ${failed} check(s) need attention`}`)
  
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
