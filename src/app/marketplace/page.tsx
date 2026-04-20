import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceClient from './MarketplaceClient'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all public plans with author info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await (supabase as any)
    .from('plan_templates')
    .select(`
      id, name, distance, level, weeks_min, weeks_max,
      description, meta, author_type, author_id,
      avg_completion_rate, total_starts, avg_rating, review_count
    `)
    .eq('is_public', true)
    .order('total_starts', { ascending: false })
    .limit(50)

  // Fetch coach profiles for authored plans
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coachIds = [...new Set(((plans ?? []) as any[]).filter(p => p.author_id).map(p => p.author_id))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coaches } = coachIds.length > 0 ? await (supabase as any)
    .from('coach_profiles')
    .select('user_id, display_name, slug, verified, photo_url')
    .in('user_id', coachIds) : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plansWithCoach = ((plans ?? []) as any[]).map(p => ({
    ...p,
    coach: coaches?.find((c: { user_id: string }) => c.user_id === p.author_id) ?? null,
  }))

  return <MarketplaceClient plans={plansWithCoach} />
}
