// ─── Starter Recipe Templates ─────────────────────────────────────────────────
// Seeded automatically on first Fuel tab visit when recipe repo is empty

import type { RecipeIngredient } from '@/types/database'

export interface StarterRecipe {
  name: string
  servings: number
  kcal_total: number
  protein_total: number
  carbs_total: number
  fat_total: number
  ingredients: RecipeIngredient[]
  notes: string
}

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    name: 'Overnight Oats',
    servings: 1,
    kcal_total: 420,
    protein_total: 22,
    carbs_total: 58,
    fat_total: 10,
    ingredients: [
      { name: 'Rolled oats', quantity: 80, unit: 'g' },
      { name: 'Milk', quantity: 200, unit: 'ml' },
      { name: 'Greek yogurt', quantity: 100, unit: 'g' },
      { name: 'Banana', quantity: 1, unit: 'piece' },
      { name: 'Honey', quantity: 1, unit: 'tbsp' },
      { name: 'Chia seeds', quantity: 10, unit: 'g' },
    ],
    notes: 'Mix oats, milk and yogurt the night before. Top with banana and honey in the morning. Great pre-long-run breakfast.',
  },
  {
    name: 'Chicken & Rice (Recovery)',
    servings: 2,
    kcal_total: 740,
    protein_total: 72,
    carbs_total: 82,
    fat_total: 10,
    ingredients: [
      { name: 'Chicken breast', quantity: 400, unit: 'g' },
      { name: 'White rice', quantity: 160, unit: 'g' },
      { name: 'Broccoli', quantity: 200, unit: 'g' },
      { name: 'Olive oil', quantity: 1, unit: 'tbsp' },
      { name: 'Garlic', quantity: 2, unit: 'piece' },
      { name: 'Soy sauce', quantity: 1, unit: 'tbsp' },
    ],
    notes: 'Classic post-run recovery meal. High protein and simple carbs. Cook rice and steam broccoli while grilling chicken.',
  },
  {
    name: 'Pasta Bolognese',
    servings: 3,
    kcal_total: 1350,
    protein_total: 81,
    carbs_total: 180,
    fat_total: 27,
    ingredients: [
      { name: 'Pasta', quantity: 300, unit: 'g' },
      { name: 'Beef mince (lean)', quantity: 400, unit: 'g' },
      { name: 'Chopped tomatoes', quantity: 400, unit: 'g' },
      { name: 'Onion', quantity: 1, unit: 'piece' },
      { name: 'Garlic', quantity: 3, unit: 'piece' },
      { name: 'Olive oil', quantity: 1, unit: 'tbsp' },
    ],
    notes: 'Pre long-run carb-load dinner. Make the night before a big session. Simple and effective.',
  },
  {
    name: 'Protein Smoothie',
    servings: 1,
    kcal_total: 380,
    protein_total: 38,
    carbs_total: 42,
    fat_total: 7,
    ingredients: [
      { name: 'Whey protein powder', quantity: 30, unit: 'g' },
      { name: 'Banana', quantity: 1, unit: 'piece' },
      { name: 'Milk', quantity: 300, unit: 'ml' },
      { name: 'Peanut butter', quantity: 1, unit: 'tbsp' },
      { name: 'Blueberries', quantity: 80, unit: 'g' },
    ],
    notes: 'Post-run recovery shake. Drink within 30 minutes of finishing. Blend until smooth.',
  },
  {
    name: 'Salmon & Sweet Potato',
    servings: 2,
    kcal_total: 820,
    protein_total: 64,
    carbs_total: 72,
    fat_total: 28,
    ingredients: [
      { name: 'Salmon fillet', quantity: 400, unit: 'g' },
      { name: 'Sweet potato', quantity: 400, unit: 'g' },
      { name: 'Spinach', quantity: 100, unit: 'g' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'Lemon', quantity: 1, unit: 'piece' },
    ],
    notes: 'Omega-3 rich recovery dinner. Bake salmon and sweet potato together at 200°C for 25 minutes.',
  },
  {
    name: 'Banana & Peanut Butter Toast',
    servings: 1,
    kcal_total: 320,
    protein_total: 12,
    carbs_total: 48,
    fat_total: 10,
    ingredients: [
      { name: 'Sourdough bread', quantity: 2, unit: 'slice' },
      { name: 'Peanut butter', quantity: 2, unit: 'tbsp' },
      { name: 'Banana', quantity: 1, unit: 'piece' },
    ],
    notes: 'Quick pre-run snack (90 mins before). Easy to digest, good energy for an easy or medium session.',
  },
  {
    name: 'Greek Yogurt Bowl',
    servings: 1,
    kcal_total: 310,
    protein_total: 28,
    carbs_total: 38,
    fat_total: 5,
    ingredients: [
      { name: 'Greek yogurt (0% fat)', quantity: 250, unit: 'g' },
      { name: 'Granola', quantity: 40, unit: 'g' },
      { name: 'Mixed berries', quantity: 100, unit: 'g' },
      { name: 'Honey', quantity: 1, unit: 'tsp' },
    ],
    notes: 'High-protein snack or light breakfast. Good on rest days when calorie targets are lower.',
  },
  {
    name: 'Homemade Energy Gel',
    servings: 4,
    kcal_total: 400,
    protein_total: 0,
    carbs_total: 100,
    fat_total: 0,
    ingredients: [
      { name: 'Maltodextrin', quantity: 60, unit: 'g' },
      { name: 'Fructose', quantity: 30, unit: 'g' },
      { name: 'Water', quantity: 120, unit: 'ml' },
      { name: 'Salt', quantity: 1, unit: 'tsp' },
    ],
    notes: '2:1 maltodextrin:fructose ratio. Each portion = 25g carbs. Take every 45min on long runs. Add caffeine powder for race day version.',
  },
]
