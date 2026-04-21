'use client'

import { useState, useMemo } from 'react'
import type { MealPlanEntryWithRecipe } from '@/types/database'
import { inferCategory, formatQty } from '@/lib/nutritionUtils'

function ShoppingList({ entries }: { entries: MealPlanEntryWithRecipe[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const aggregated = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; unit: string; category: string }>()
    for (const e of entries) {
      const mult = e.portions / e.recipe.servings
      for (const ing of (e.recipe.ingredients ?? [])) {
        if (!ing.name.trim()) continue
        const key = `${ing.name.toLowerCase()}::${ing.unit}`
        const existing = map.get(key)
        if (existing) {
          existing.quantity += ing.quantity * mult
        } else {
          map.set(key, {
            name: ing.name,
            quantity: ing.quantity * mult,
            unit: ing.unit,
            category: inferCategory(ing.name),
          })
        }
      }
    }
    return [...map.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [entries])

  const categories = [...new Set(aggregated.map(i => i.category))]

  function copyList() {
    const text = categories.map(cat => {
      const items = aggregated.filter(i => i.category === cat)
      return `${cat}:\n${items.map(i => `  ${formatQty(i.quantity)} ${i.unit} ${i.name}`).join('\n')}`
    }).join('\n\n')
    navigator.clipboard.writeText('Shopping list:\n\n' + text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (aggregated.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <div className="text-3xl mb-2">🛒</div>
        <p className="text-sm text-gray-500">Assign meals to days to generate your shopping list.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-gray-900">🛒 Shopping list</span>
          <span className="text-[10px] text-gray-400 ml-2">{aggregated.length} items</span>
        </div>
        <button onClick={copyList}
          className="text-[11px] font-semibold text-[var(--ns-forest)]">
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <div className="px-4 py-3 space-y-4">
        {categories.map(cat => (
          <div key={cat}>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">{cat}</div>
            <div className="space-y-1.5">
              {aggregated.filter(i => i.category === cat).map((item, idx) => {
                const key = `${item.name}::${item.unit}`
                const done = checked.has(key)
                return (
                  <button key={idx} onClick={() => setChecked(s => {
                    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n
                  })}
                    className="w-full flex items-center gap-3 text-left">
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${done ? 'border-[var(--ns-forest)] bg-[var(--ns-forest)]' : 'border-gray-300'}`}>
                      {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-sm flex-1 ${done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                      {item.name}
                    </span>
                    <span className={`text-xs ${done ? 'text-gray-300' : 'text-gray-400'}`}>
                      {formatQty(item.quantity)} {item.unit}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


export default ShoppingList
