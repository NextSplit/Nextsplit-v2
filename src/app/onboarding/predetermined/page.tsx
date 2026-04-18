import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlanBrowserClient from './PlanBrowserClient'
import type { PlanTemplate } from '@/types/database'

export default async function PredeterminedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all templates — lightweight, no weeks_data
  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, slug, name, subtitle, distance, level, weeks_min, weeks_max, runs_per_week, peak_km_week, longest_run_km, description, meta')
    .order('distance')
    .order('level')

  const templates = (error ? [] : data) as PlanTemplate[]

  return <PlanBrowserClient templates={templates} />
}
