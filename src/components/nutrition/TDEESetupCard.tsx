'use client'

import { useState, useEffect } from 'react'

function TDEESetupCard({ onSave }: { onSave: (h: number, a: number, s: 'male' | 'female') => void }) {
  const [open, setOpen] = useState(false)
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const h = localStorage.getItem('nextsplit_tdee_height')
    const a = localStorage.getItem('nextsplit_tdee_age')
    const s = localStorage.getItem('nextsplit_tdee_sex') as 'male' | 'female' | null
    if (h) setHeight(h)
    if (a) setAge(a)
    if (s) setSex(s)
    if (h && a && s) {
      setSaved(true)
      onSave(Number(h), Number(a), s)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const h = Number(height)
    const a = Number(age)
    if (!h || !a || h < 100 || h > 250 || a < 10 || a > 100) return
    localStorage.setItem('nextsplit_tdee_height', String(h))
    localStorage.setItem('nextsplit_tdee_age', String(a))
    localStorage.setItem('nextsplit_tdee_sex', sex)
    onSave(h, a, sex)
    setSaved(true)
    setOpen(false)
  }

  if (saved && !open) {
    const h = localStorage.getItem('nextsplit_tdee_height')
    const a = localStorage.getItem('nextsplit_tdee_age')
    const s = localStorage.getItem('nextsplit_tdee_sex')
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <div>
            <p className="text-xs font-semibold text-gray-700">TDEE profile</p>
            <p className="text-[10px] text-gray-400">{s === 'female' ? 'Female' : 'Male'} · {h}cm · {a}yo</p>
          </div>
        </div>
        <span className="text-[10px] text-teal-600 font-semibold">Edit ✎</span>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-teal-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⚖️</span>
          <div>
            <p className="text-sm font-bold text-gray-900">Calorie profile</p>
            <p className="text-[10px] text-gray-400">For accurate TDEE calculation</p>
          </div>
        </div>
        {saved && <button onClick={() => setOpen(false)} className="text-gray-300 text-lg">×</button>}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Height (cm)</label>
          <input
            type="number" inputMode="numeric" value={height}
            onChange={e => setHeight(e.target.value)}
            placeholder="175"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Age</label>
          <input
            type="number" inputMode="numeric" value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="30"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Sex</label>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map(s => (
            <button key={s} onClick={() => setSex(s)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${sex === s ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {s === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-teal-500 text-white text-sm font-bold">
        Save profile
      </button>
    </div>
  )
}

// ─── AI Fuel Coach Card ───────────────────────────────────────────────────────


export default TDEESetupCard
