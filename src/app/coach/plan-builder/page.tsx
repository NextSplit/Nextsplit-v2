import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { redirect } from 'next/navigation'
import PlanBuilderClient from './PlanBuilderClient'

// /coach/plan-builder — coach plan authoring tool (P3.2).
// New plan: visit fresh, builder opens blank.
// Edit plan: visit /coach/plan-builder?edit=<template_uuid>. Server loads
// the template, verifies the caller is the author, and pre-fills the
// builder. Save endpoint UPDATEs in place (template_id round-trips
// through the form).

export default async function PlanBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coach } = await db(supabase)
    .from('coach_profiles')
    .select('user_id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!coach) redirect('/coach/setup')

  // P3.2 edit-flow: load existing template if ?edit=<uuid>. Author check
  // is server-side — non-author edit URLs silently bounce to fresh builder
  // (don't 404 — keeps the surface forgiving for shared/copied URLs).
  const params = await searchParams
  const editId = params?.edit

  let initialTemplate = undefined
  if (editId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tmpl } = await (db(supabase) as any)
      .from('plan_templates')
      .select('id, name, distance, level, description, price_gbp, is_public, weeks_data, author_id')
      .eq('id', editId)
      .eq('author_id', user.id)
      .maybeSingle()
    if (tmpl) {
      initialTemplate = {
        id:          tmpl.id          as string,
        name:        tmpl.name        as string,
        distance:    tmpl.distance    as string,
        level:       tmpl.level       as string,
        description: tmpl.description as string | null,
        price_gbp:   tmpl.price_gbp   as number | null,
        is_public:   tmpl.is_public   as boolean,
        weeks_data:  tmpl.weeks_data  as never,
      }
    }
  }

  return <PlanBuilderClient coachName={coach.display_name} initialTemplate={initialTemplate} />
}
