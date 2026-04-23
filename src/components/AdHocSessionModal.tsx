'use client'

import { useState } from 'react'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useActivityLog, type ActivityType } from '@/hooks/useActivityLog'

const AD_HOC_TYPES = [
  { c: 'run-easy',  label: 'Easy run',       emoji: '🏃', desc: 'Unplanned easy effort', activityType: null },
  { c: 'gym-a',     label: 'Lower body',      emoji: '🏋️', desc: 'Squats, deadlifts, legs', activityType: null },
  { c: 'gym-b',     label: 'Upper body',      emoji: '💪', desc: 'Pull, push, core', activityType: null },
  { c: 'gym-c',     label: 'Mobility',        emoji: '🧘', desc: 'Stretching, posterior chain', activityType: 'yoga' as ActivityType },
  { c: 'cross',     label: 'Cross-training',  emoji: '🚴', desc: 'Cycling, swimming, etc.', activityType: 'cycle' as ActivityType },
  { c: 'walk',      label: 'Walk / hike',     emoji: '🚶', desc: 'Walking or hiking', activityType: 'walk' as ActivityType },
]

function AdHocSessionModal({ planId, weekN, dayIndex, onClose, onSaved }: {
  planId: string
  weekN: number
  dayIndex: number
  onClose: () => void
  onSaved: () => void
}) {
  const { logSession } = useTrainingLog(planId)
  const { saveActivity } = useActivityLog()
  const [selected, setSelected] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const selectedType = AD_HOC_TYPES.find(t => t.c === selected)
      const durationSecs = duration ? parseInt(duration) * 60 : undefined
      const noteText = notes.trim() || `Ad-hoc: ${selectedType?.label}`

      // Always log to training_logs for plan adherence / XP / streaks
      await logSession({
        plan_id: planId,
        week_n: weekN,
        day_i: dayIndex,
        session_i: 99,
        done: true,
        notes: noteText,
        duration_secs: durationSecs,
      })

      // Also save to activity_logs for cross-training types → affects TDEE
      if (selectedType?.activityType) {
        await saveActivity({
          activity_type: selectedType.activityType,
          duration_secs: durationSecs,
          notes: noteText,
        })
      }

      onSaved()
    } catch {
      // error handled by caller
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50" style={{ backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto mt-auto bg-white overflow-y-auto" style={{ borderRadius: "24px 24px 0 0", maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border-2)' }} />
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
            ×
          </button>
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Add a session</h2>
        <p className="text-xs text-gray-400 mb-4">Log extra work outside your plan — it won't affect your scheduled sessions.</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {AD_HOC_TYPES.map(t => (
            <button key={t.c} onClick={() => setSelected(s => s === t.c ? null : t.c)}
              className={`rounded-xl border p-3 text-left transition-all ${selected === t.c ? 'border-[var(--ns-ember)] bg-[var(--ns-ember-light)]' : 'border-gray-100 bg-white'}`}>
              <div className="text-xl mb-1">{t.emoji}</div>
              <div className={`text-[11px] font-bold ${selected === t.c ? 'text-[var(--ns-ember)]' : 'text-gray-700'}`}>{t.label}</div>
              <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{t.desc}</div>
              {t.activityType && (
                <div className="text-[8px] text-[var(--ns-forest-mid)] font-semibold mt-1">+TDEE</div>
              )}
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0">Duration</label>
              <div className="flex items-center gap-1.5 flex-1">
                <input type="number" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-ember)] focus:ring-2 focus:ring-[var(--ns-ember)]/20" />
                <span className="text-xs text-gray-400">min</span>
              </div>
            </div>
            {AD_HOC_TYPES.find(t => t.c === selected)?.activityType && duration && (
              <div className="flex items-center gap-2 bg-[var(--ns-ember-light)] rounded-xl px-3 py-2">
                <span className="text-xs text-[var(--ns-ember)] font-medium">
                  🔥 This will update your calorie target in the Fuel tab
                </span>
              </div>
            )}
            <div className="flex items-start gap-3">
              <label className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0 pt-2">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional — what did you do?"
                rows={2}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-ember)] focus:ring-2 focus:ring-[var(--ns-ember)]/20 resize-none" />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!selected || saving}
            className="flex-1 py-3 rounded-xl bg-[var(--ns-ember)] text-white text-sm font-bold disabled:opacity-40">
            {saving ? 'Saving…' : 'Log it ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdHocSessionModal
