import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { getStripe } from '@/lib/stripe'
import { zodError } from '@/lib/schemas'

// POST /api/character/inventory/purchase
// Creates a Stripe Checkout session for a single boost or cosmetic.
// On payment success, the Stripe webhook (src/app/api/stripe/webhook/
// route.ts) handles checkout.session.completed with metadata.source =
// 'character_inventory' and calls record_purchase_grant(...) which is
// idempotent under duplicate webhook deliveries.

const PurchaseSchema = z.object({
  item_kind: z.enum(['boost','cosmetic']),
  item_id:   z.string().min(1).max(100),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = PurchaseSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { item_kind, item_id } = parsed.data

    // Look up the item from catalog. RLS policies allow authenticated
    // reads on both catalogs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = db(supabase) as any
    const tableName = item_kind === 'boost' ? 'character_boosts_catalog' : 'character_cosmetics_catalog'
    const { data: item, error: lookupErr } = await s
      .from(tableName)
      .select('id, name, description, gbp_price, enabled')
      .eq('id', item_id)
      .single()

    if (lookupErr || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    if (!item.enabled) {
      return NextResponse.json({ error: 'Item not available' }, { status: 410 })
    }
    if (item.gbp_price === null || item.gbp_price === undefined) {
      return NextResponse.json(
        { error: 'Item is not purchasable',
          hint: 'This item is earned only — log sessions or hit a streak milestone.' },
        { status: 422 },
      )
    }

    // For cosmetics, prevent re-purchasing what the user already owns.
    // (Boosts can be re-purchased — they're consumable stacks.)
    if (item_kind === 'cosmetic') {
      const { data: existing } = await s
        .from('character_cosmetic_inventory')
        .select('cosmetic_id')
        .eq('user_id', user.id)
        .eq('cosmetic_id', item_id)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ error: 'Already owned' }, { status: 409 })
      }
    }

    const origin = req.nextUrl.origin
    const checkout = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name:        `${item_kind === 'boost' ? '🎁 Boost' : '✨ Cosmetic'}: ${item.name}`,
            description: item.description,
          },
          unit_amount: Math.round(Number(item.gbp_price) * 100),
        },
        quantity: 1,
      }],
      success_url: `${origin}/you/inventory?purchased=${encodeURIComponent(item_id)}`,
      cancel_url:  `${origin}/you/inventory?cancelled=1`,
      metadata: {
        source:             'character_inventory',
        supabase_user_id:   user.id,
        item_kind,
        item_id,
      },
    })

    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: '[api/character/inventory/purchase POST]' } })
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
