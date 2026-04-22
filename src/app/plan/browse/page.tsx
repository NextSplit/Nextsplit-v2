import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PlanTemplate } from '@/types/database'
import PlanBrowseClient from './PlanBrowseClient'

export const metadata = { title: 'Choose a Plan — NextSplit' }

export default async function PlanBrowsePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, slug, name, subtitle, distance, level, weeks_min, weeks_max, runs_per_week, peak_km_week, longest_run_km, description, meta')
    .order('distance')
    .order('level')

  const templates = (error ? [] : data) as PlanTemplate[]

  return <PlanBrowseClient templates={templates} />
}
