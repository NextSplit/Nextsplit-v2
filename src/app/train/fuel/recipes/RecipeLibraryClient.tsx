'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'
import { STARTER_RECIPES } from '@/lib/starterRecipes'
import type { Recipe } from '@/types/database'

// PR C2 — Recipe library at /train/fuel/recipes.
// V1: reads user's own recipes from the `recipes` DB table (left intact
// by PR #80). Empty state for fresh users prompts a quick-add form.
// Future: search by macro, recipe sharing, AI-suggested recipes.

export function RecipeLibraryClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      const { data } = await db(supabase)
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const existing = (data ?? []) as Recipe[]

      // PR F2 — auto-seed starter recipes for new users on first visit.
      // Mirrors useRecipes seed pattern. 18 starter recipes cover the
      // breakfast / pre-run / lunch / post-run / dinner / snack slots.
      if (existing.length === 0) {
        const seeded: Recipe[] = []
        for (const r of STARTER_RECIPES) {
          const { data: inserted } = await db(supabase)
            .from('recipes')
            .insert({ user_id: user.id, ...r })
            .select()
            .single()
          if (inserted) seeded.push(inserted as Recipe)
        }
        if (!cancelled) {
          setRecipes(seeded.sort((a, b) => b.created_at.localeCompare(a.created_at)))
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setRecipes(existing)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center justify-between"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
          <div className="flex items-center gap-2">
            <Link href="/train" className="text-xl" style={{ color: 'var(--color-text-secondary)' }}>‹</Link>
            <h1 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>Recipes</h1>
          </div>
          <button onClick={() => setShowAdd(s => !s)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{
              background: showAdd ? 'var(--color-surface-2)' : '#ffb800',
              color: showAdd ? 'var(--color-text-secondary)' : '#0a0e1a',
            }}>
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

        {showAdd && (
          <RecipeQuickAdd onAdded={(r) => { setRecipes([r, ...recipes]); setShowAdd(false) }} />
        )}

        {loading && (
          <div className="rounded-2xl animate-pulse h-24"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
        )}

        {!loading && recipes.length === 0 && (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}>
            <div className="text-4xl mb-3">📖</div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              No recipes yet
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
              Tap + Add above to save your first recipe. We&apos;ll use these
              when you assign meals to your daily slots.
            </p>
          </div>
        )}

        {!loading && recipes.map(r => (
          <div key={r.id}
            className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                  {r.name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {r.servings} serving{r.servings !== 1 ? 's' : ''}
                </p>
              </div>
              {r.kcal_total !== null && (
                <p className="text-base font-black ml-3 flex-shrink-0"
                  style={{ color: '#ffb800' }}>
                  {r.kcal_total}<span className="text-[10px] ml-0.5">kcal</span>
                </p>
              )}
            </div>
            {(r.protein_total || r.carbs_total || r.fat_total) && (
              <div className="flex gap-3 mt-2 text-[11px]">
                {r.protein_total !== null && (
                  <span style={{ color: '#ef4444' }}><strong>P</strong> {r.protein_total}g</span>
                )}
                {r.carbs_total !== null && (
                  <span style={{ color: '#3b82f6' }}><strong>C</strong> {r.carbs_total}g</span>
                )}
                {r.fat_total !== null && (
                  <span style={{ color: '#eab308' }}><strong>F</strong> {r.fat_total}g</span>
                )}
              </div>
            )}
          </div>
        ))}

        <p className="text-[10px] text-center mt-4 px-4"
          style={{ color: 'var(--color-text-tertiary)' }}>
          Meal-slot assignment ships in a follow-on PR. For now, recipes
          here are your private library — use them as quick reference.
        </p>
      </div>
    </div>
  )
}

function RecipeQuickAdd({ onAdded }: { onAdded: (r: Recipe) => void }) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!name.trim() || saving) return
    setSaving(true); setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not signed in'); return }
      const row = {
        user_id: user.id,
        name: name.trim(),
        servings: 1,
        kcal_total:    kcal    ? parseInt(kcal, 10)    : null,
        protein_total: protein ? parseInt(protein, 10) : null,
        carbs_total:   carbs   ? parseInt(carbs, 10)   : null,
        fat_total:     fat     ? parseInt(fat, 10)     : null,
        ingredients: [],
        notes: null,
      }
      const { data, error: insertErr } = await db(supabase)
        .from('recipes')
        .insert(row)
        .select()
        .single()
      if (insertErr) { setError(insertErr.message); return }
      if (data) onAdded(data as Recipe)
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl p-4 space-y-2"
      style={{
        background: 'linear-gradient(135deg, rgba(255,184,0,0.08), rgba(255,184,0,0.02))',
        border: '2px solid rgba(255,184,0,0.40)',
      }}>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#ffb800' }}>
        Quick add
      </p>
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="Recipe name (e.g. Overnight oats)"
        className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none"
        style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)', color: 'var(--color-text-primary)' }} />
      <div className="grid grid-cols-4 gap-2">
        <Field value={kcal}    onChange={setKcal}    placeholder="kcal" />
        <Field value={protein} onChange={setProtein} placeholder="P g" />
        <Field value={carbs}   onChange={setCarbs}   placeholder="C g" />
        <Field value={fat}     onChange={setFat}     placeholder="F g" />
      </div>
      {error && <p className="text-[11px]" style={{ color: '#ef4444' }}>{error}</p>}
      <button onClick={save} disabled={!name.trim() || saving}
        className="w-full py-2.5 rounded-xl text-sm font-black disabled:opacity-40 active:scale-95"
        style={{ background: '#ffb800', color: '#0a0e1a' }}>
        {saving ? 'Saving…' : 'Save recipe'}
      </button>
    </div>
  )
}

function Field({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="number" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-2 rounded-xl text-xs font-bold outline-none text-center"
      style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)', color: 'var(--color-text-primary)' }} />
  )
}
