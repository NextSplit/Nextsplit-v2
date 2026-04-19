'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useSupabase } from '@/hooks/useSupabase'
import { useToast } from '@/components/Toast'
import { db } from '@/lib/supabase/db'

function AthleteProfileSection() {
  const supabase = useSupabase()
  const { profile, refresh } = useProfile()
  const [saving, setSaving] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [injuryNotes, setInjuryNotes] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (profile && !loaded) {
      setWeightKg(profile.weight_kg?.toString() ?? '')
      setInjuryNotes(profile.injury_notes ?? '')
      setLoaded(true)
    }
  }, [profile, loaded])

  async function save() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await db(supabase).from('profiles').upsert({
        id: user.id,
        weight_kg: weightKg ? Number(weightKg) : null,
        injury_notes: injuryNotes || null,
      })
      refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Athlete profile</p>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Weight (kg)</label>
          <input type="number" value={weightKg}
            onChange={e => setWeightKg(e.target.value)}
            placeholder="e.g. 75"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Injury notes</label>
          <textarea value={injuryNotes}
            onChange={e => setInjuryNotes(e.target.value)}
            rows={2} placeholder="Any current niggles or injury history..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
        </div>
        <button onClick={save} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}


export default AthleteProfileSection
