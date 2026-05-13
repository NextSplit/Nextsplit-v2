'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'
import type { Recipe } from '@/types/database'

// PR E5 — Assign a recipe (or a freeform meal) to a meal slot.
// Two tabs: "From recipes" picks from the user's library; "Freeform"
// lets them log a one-off (name + macros) without saving a recipe.
//
// The hook owner (FuelDailyView via useMealPlan().assignMeal) handles
// the actual DB write — this modal just collects input.

interface Props {
  slotId:    string
  slotLabel: string
  planDate:  string
  onClose:   () => void
  onAssignRecipe:  (recipe: Recipe, portions: number) => Promise<void>
  onAssignFreeform: (input: {
    name: string
    kcal_total?: number | null
    protein_total?: number | null
    carbs_total?: number | null
    fat_total?: number | null
  }) => Promise<void>
}

export function AssignMealModal({ slotLabel, onClose, onAssignRecipe, onAssignFreeform }: Props) {
  const [tab, setTab] = useState<'recipes' | 'freeform'>('recipes')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setRecipesLoading(false); return }
      const { data } = await db(supabase)
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
      if (!cancelled) {
        setRecipes((data ?? []) as Recipe[])
        setRecipesLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = search.trim()
    ? recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : recipes

  async function pickRecipe(recipe: Recipe, portions: number) {
    setSaving(true); setError(null)
    try {
      await onAssignRecipe(recipe, portions)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/55" onClick={onClose} style={{ backdropFilter: 'blur(4px)' }} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-w-lg mx-auto"
        style={{
          background: 'var(--color-surface)',
          maxHeight: '88dvh',
          paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom, 0px)))',
        }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-[var(--color-border-2)] rounded-full mx-auto mt-3" />

        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#ffb800' }}>
            Assign to {slotLabel}
          </p>
        </div>

        <div className="flex gap-1 mx-4 mb-3 rounded-xl p-1" style={{ background: 'var(--color-surface-2)' }}>
          {(['recipes', 'freeform'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-black transition-all"
              style={tab === t
                ? { background: '#ffb800', color: '#0a0e1a' }
                : { background: 'transparent', color: 'var(--color-text-tertiary)' }
              }>
              {t === 'recipes' ? '📖 From recipes' : '✍️ Freeform'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-4 pb-2" style={{ maxHeight: 'calc(88dvh - 140px)' }}>
          {tab === 'recipes' ? (
            <RecipesTab
              recipes={filtered}
              loading={recipesLoading}
              search={search}
              setSearch={setSearch}
              saving={saving}
              onPick={pickRecipe}
            />
          ) : (
            <FreeformTab
              saving={saving}
              onSave={async (input) => {
                setSaving(true); setError(null)
                try {
                  await onAssignFreeform(input)
                  onClose()
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to assign')
                } finally { setSaving(false) }
              }}
            />
          )}

          {error && (
            <p className="text-[11px] mt-2" style={{ color: '#ef4444' }}>{error}</p>
          )}
        </div>
      </div>
    </>
  )
}

function RecipesTab({ recipes, loading, search, setSearch, saving, onPick }: {
  recipes: Recipe[]; loading: boolean; search: string; setSearch: (s: string) => void
  saving: boolean; onPick: (recipe: Recipe, portions: number) => void
}) {
  if (loading) {
    return <div className="rounded-2xl animate-pulse h-20"
      style={{ background: 'var(--color-surface-2)' }} />
  }
  if (recipes.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center"
        style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          No recipes yet. {' '}
          <Link href="/train/fuel/recipes" className="font-bold" style={{ color: '#ffb800' }}>
            Add one →
          </Link>
        </p>
      </div>
    )
  }
  return (
    <>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search recipes…"
        className="w-full px-3 py-2.5 mb-2 rounded-xl text-sm outline-none"
        style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)', color: 'var(--color-text-primary)' }} />
      <div className="space-y-2">
        {recipes.map(r => (
          <button key={r.id} onClick={() => onPick(r, 1)} disabled={saving}
            className="w-full text-left rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] transition-transform disabled:opacity-50"
            style={{ background: 'var(--color-surface-2)', border: '1.5px solid var(--color-border-2)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {r.name}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {r.servings} serving{r.servings !== 1 ? 's' : ''}
                {r.kcal_total !== null && ` · ${r.kcal_total} kcal`}
              </p>
            </div>
            <span className="text-base font-black" style={{ color: '#ffb800' }}>+</span>
          </button>
        ))}
      </div>
    </>
  )
}

function FreeformTab({ saving, onSave }: {
  saving: boolean
  onSave: (input: { name: string; kcal_total?: number | null; protein_total?: number | null; carbs_total?: number | null; fat_total?: number | null }) => void
}) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  function submit() {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      kcal_total:    kcal    ? parseInt(kcal, 10)    : null,
      protein_total: protein ? parseInt(protein, 10) : null,
      carbs_total:   carbs   ? parseInt(carbs, 10)   : null,
      fat_total:     fat     ? parseInt(fat, 10)     : null,
    })
  }

  return (
    <div className="space-y-2">
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="What did you eat?"
        className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none"
        style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)', color: 'var(--color-text-primary)' }} />
      <div className="grid grid-cols-4 gap-2">
        <NumField value={kcal}    onChange={setKcal}    placeholder="kcal" />
        <NumField value={protein} onChange={setProtein} placeholder="P g" />
        <NumField value={carbs}   onChange={setCarbs}   placeholder="C g" />
        <NumField value={fat}     onChange={setFat}     placeholder="F g" />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
        Macros optional — leave blank if you don&apos;t know.
      </p>
      <button onClick={submit} disabled={!name.trim() || saving}
        className="w-full py-2.5 rounded-xl text-sm font-black disabled:opacity-40 active:scale-95"
        style={{ background: '#ffb800', color: '#0a0e1a' }}>
        {saving ? 'Saving…' : 'Add to slot'}
      </button>
    </div>
  )
}

function NumField({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <input type="number" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-2 rounded-xl text-xs font-bold outline-none text-center"
      style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)', color: 'var(--color-text-primary)' }} />
  )
}
