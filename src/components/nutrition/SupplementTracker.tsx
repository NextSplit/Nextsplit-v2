'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/Toast'

const SUPPLEMENTS = [
  { id: 'omega3',  label: 'Omega-3',       dose: '2g'        },
  { id: 'vit_d',   label: 'Vitamin D3/K2', dose: '2000IU'    },
  { id: 'magnesium',label: 'Magnesium',    dose: '300mg'      },
  { id: 'creatine',label: 'Creatine',      dose: '5g'        },
  { id: 'protein', label: 'Protein',       dose: 'post-run'  },
]

function suppTodayKey() {
  const d = new Date()
  return `nextsplit_supps_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** Compute how many consecutive days had at least one supplement logged */
function computeSuppStreak(): number {
  let streak = 0
  const d = new Date()
  for (let i = 0; i < 60; i++) {
    const key = `nextsplit_supps_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const raw = localStorage.getItem(key)
    if (!raw) { if (i > 0) break; d.setDate(d.getDate() - 1); continue }
    try {
      const parsed = JSON.parse(raw)
      const hasAny = Object.values(parsed).some(Boolean)
      if (!hasAny) { if (i > 0) break; d.setDate(d.getDate() - 1); continue }
      streak++
    } catch { break }
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function SupplementTracker() {
  const key = suppTodayKey()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setChecked(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [key])

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    localStorage.setItem(key, JSON.stringify(next))
    // Update streak counter so profile RPG reads it
    const streak = computeSuppStreak()
    localStorage.setItem('nextsplit_supp_streak', String(streak))
  }

  const doneCount = SUPPLEMENTS.filter(s => checked[s.id]).length

  if (!loaded) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">💊 Supplements</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doneCount === SUPPLEMENTS.length ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {doneCount}/{SUPPLEMENTS.length} today
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {SUPPLEMENTS.map(s => (
          <button key={s.id} onClick={() => toggle(s.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left">
            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked[s.id] ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
              {checked[s.id] && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <span className={`text-sm font-medium ${checked[s.id] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {s.label}
              </span>
              <span className="text-[10px] text-gray-400 ml-2">{s.dose}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


export default SupplementTracker
