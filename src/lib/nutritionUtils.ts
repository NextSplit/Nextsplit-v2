/**
 * Shared helpers for nutrition/meal planning components.
 */
import type { Recipe } from '@/types/database'

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function perPortion(recipe: Recipe, portions: number) {
  const mult = portions / recipe.servings
  return {
    kcal:    Math.round((recipe.kcal_total    ?? 0) * mult),
    protein: Math.round((recipe.protein_total ?? 0) * mult * 10) / 10,
    carbs:   Math.round((recipe.carbs_total   ?? 0) * mult * 10) / 10,
    fat:     Math.round((recipe.fat_total     ?? 0) * mult * 10) / 10,
  }
}

// ─── Macro Bar ─────────────────────────────────────────────────────────────


export function formatQty(q: number): string {
  const r = Math.round(q * 10) / 10
  return r % 1 === 0 ? r.toString() : r.toFixed(1)
}

export function inferCategory(name: string): string {
  const n = name.toLowerCase()
  if (/chicken|beef|salmon|tuna|turkey|egg|pork|lamb|fish|shrimp|prawn/.test(n)) return '🥩 Protein'
  if (/milk|yogurt|cheese|cream|butter|whey/.test(n)) return '🥛 Dairy'
  if (/rice|pasta|oat|bread|flour|quinoa|noodle|potato|sweet potato/.test(n)) return '🌾 Carbs'
  if (/spinach|kale|broccoli|carrot|tomato|lettuce|pepper|onion|garlic|cucumber|courgette|zucchini|mushroom|celery|pea|bean|lentil/.test(n)) return '🥦 Produce'
  if (/banana|apple|orange|berry|berries|mango|blueberry|strawberry/.test(n)) return '🍎 Fruit'
  if (/olive oil|coconut oil|avocado|nut|seed|almond|walnut|peanut/.test(n)) return '🥑 Fats'
  if (/protein powder|creatine|supplement|vitamin/.test(n)) return '💊 Supplements'
  return '🥫 Pantry'
}
