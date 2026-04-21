import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceClient from './MarketplaceClient'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all public plan templates with author info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans } = await (supabase as any)
    .from('plan_templates')
    .select(`
      id, slug, name, subtitle, distance, level,
      weeks_min, weeks_max, description, meta,
      author_type, author_id, is_public,
      avg_completion_rate, total_starts, avg_rating, review_count
    `)
    .eq('is_public', true)
    .order('total_starts', { ascending: false })
    .limit(60)

  // Batch-fetch coach profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coachIds = [...new Set(((plans ?? []) as any[]).filter(p => p.author_id).map((p: any) => p.author_id))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coaches } = coachIds.length > 0 ? await (supabase as any)
    .from('coach_profiles')
    .select('user_id, display_name, slug, verified, photo_url')
    .in('user_id', coachIds) : { data: [] }

  // Fetch user's purchases to flag owned plans
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: purchases } = await (supabase as any)
    .from('plan_purchases')
    .select('plan_template_id')
    .eq('user_id', user.id)

  const purchasedIds = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (purchases ?? []).map((p: any) => p.plan_template_id)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialPlans = ((plans ?? []) as any[]).map(p => ({
    ...p,
    price_gbp: (p.meta as Record<string, unknown>)?.price_gbp ?? null,
    coach: coaches?.find((c: { user_id: string }) => c.user_id === p.author_id) ?? null,
    owned: p.author_type === 'nextsplit' || !p.meta?.price_gbp || purchasedIds.has(p.id),
  }))

  return <MarketplaceClient initialPlans={initialPlans} />
}
