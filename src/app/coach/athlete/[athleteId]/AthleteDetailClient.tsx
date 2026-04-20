'use client'

import { useState } from 'react'
import { CoachMessageThread } from '@/components/coach/CoachMessageThread'

interface Log {
  week_n: number; day_i: number; session_i: number
  done: boolean; km: number | null; pace: string | null
  effort: number | null; duration_secs: number | null; logged_at: string
}

interface Wellness {
  log_date: string; sleep: number | null; energy: number | null
  mood: number | null; soreness: number | null; weight_kg: number | null
}

interface Plan {
  id: string; name: string; plan_type: string
  total_weeks: number; current_week: number; race_date: string | null
}

interface Profile {
  display_name: string | null; age: number | null
  running_experience: string | null; weekly_km_current: number; handle: string | null
}

interface Props {
  athleteId:    string
  coachId:      string
  profile:      Profile | null
  logs:         Log[]
  wellness:     Wellness[]
  activePlan:   Plan | null
  relationship: { share_logs: boolean; share_wellness: boolean; share_nutrition: boolean }
}

function StatusDot({ value, low, high }: { value: number | null; low: number; high: number }) {
  if (!value) return <span className="text-slate-300">—</span>
  const colour = value >= high ? 'bg-emerald-400' : value >= low ? 'bg-amber-400' : 'bg-red-400'
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colour}`} />
  )
}

export default function AthleteDetailClient({
  athleteId, coachId, profile, logs, wellness, activePlan, relationship,
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'wellness' | 'message'>('overview')
  const [showAnnotate, setShowAnnotate]   = useState(false)
  const [annotateNote, setAnnotateNote]   = useState('')
  const [annotateReaction, setAnnotateReaction] = useState<string>('')
  const [annotating, setAnnotating]       = useState(false)
  const [annotateSuccess, setAnnotateSuccess] = useState(false)

  const doneLogs    = logs.filter(l => l.done)
  const totalKm     = doneLogs.reduce((a, l) => a + (l.km ?? 0), 0)
  const completionRate = logs.length > 0 ? Math.round((doneLogs.length / logs.length) * 100) : 0
  const avgSleep    = wellness.length > 0
    ? Math.round(wellness.reduce((a, w) => a + (w.sleep ?? 0), 0) / wellness.filter(w => w.sleep).length * 10) / 10
    : null
  const avgSoreness = wellness.length > 0
    ? Math.round(wellness.reduce((a, w) => a + (w.soreness ?? 0), 0) / wellness.filter(w => w.soreness).length * 10) / 10
    : null

  const sendAnnotation = async () => {
    if (!annotateNote.trim()) return
    setAnnotating(true)
    try {
      await fetch('/api/coach/annotate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          athlete_id: athleteId,
          plan_id:    activePlan?.id ?? 'general',
          week_n:     activePlan?.current_week ?? 0,
          day_i: 0, session_i: 0,
          note:     annotateNote,
          reaction: annotateReaction || null,
        }),
      })
      setAnnotateSuccess(true)
      setAnnotateNote('')
      setAnnotateReaction('')
      setTimeout(() => { setAnnotateSuccess(false); setShowAnnotate(false) }, 1500)
    } finally {
      setAnnotating(false)
    }
  }

  const name = profile?.display_name ?? (profile?.handle ? `@${profile.handle}` : 'Athlete')

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <a href="/coach/squad" className="text-slate-400 text-xl">←</a>
          <div className="flex-1">
            <h1 className="text-base font-black text-slate-900">{name}</h1>
            {activePlan && (
              <p className="text-xs text-slate-400">
                Week {activePlan.current_week}/{activePlan.total_weeks} · {activePlan.name}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowAnnotate(true)}
            className="bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl"
          >
            + Note
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto flex gap-1 mt-3 bg-slate-100 rounded-xl p-1">
          {(['overview','sessions','wellness','message'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <>
            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sessions (4wk)', value: `${doneLogs.length}`, sub: `${completionRate}% completion` },
                { label: 'Total km (4wk)', value: `${Math.round(totalKm)}km`, sub: 'All logged runs' },
                { label: 'Avg sleep', value: avgSleep ? `${avgSleep}h` : '—', sub: 'Last 2 weeks' },
                { label: 'Avg soreness', value: avgSoreness ? `${avgSoreness}/10` : '—', sub: 'Last 2 weeks' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-3">
                  <p className="text-xl font-black text-slate-900">{s.value}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</p>
                  <p className="text-[10px] text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Profile */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Athlete profile</p>
              {[
                { label: 'Experience', value: ({ lt_6mo: '< 6 months', '6_12mo': '6–12 months', '1_3yr': '1–3 years', '3yr_plus': '3+ years' } as Record<string,string>)[profile?.running_experience ?? ''] ?? '—' },
                { label: 'Weekly km (stated)', value: profile?.weekly_km_current ? `${profile.weekly_km_current}km` : '—' },
                { label: 'Age', value: profile?.age ? String(profile.age) : '—' },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Wellness summary */}
            {relationship.share_wellness && wellness.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Wellness (last 7 days)</p>
                <div className="space-y-2">
                  {wellness.slice(0, 7).map(w => (
                    <div key={w.log_date} className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400 w-12 shrink-0">
                        {new Date(w.log_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        <StatusDot value={w.sleep}    low={6} high={7.5} />
                        <StatusDot value={w.energy}   low={5} high={7} />
                        <StatusDot value={w.mood}     low={5} high={7} />
                        {w.soreness !== null && (
                          <StatusDot value={10 - (w.soreness ?? 0)} low={5} high={7} />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-300">
                        💤{w.sleep ?? '—'} ⚡{w.energy ?? '—'} 😊{w.mood ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-300 mt-2">🟢 Good · 🟡 Moderate · 🔴 Low</p>
              </div>
            )}
          </>
        )}

        {/* Sessions tab */}
        {activeTab === 'sessions' && relationship.share_logs && (
          <div className="space-y-2">
            {logs.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400">
                No sessions logged in the last 4 weeks
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${log.done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    {new Date(log.logged_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {log.km ? `${log.km}km` : '—'} · {log.pace ?? '—'}/km · Effort {log.effort ?? '—'}/10
                  </p>
                </div>
                {log.done && <span className="text-emerald-500 text-xs font-bold">✓</span>}
              </div>
            ))}
          </div>
        )}

        {/* Wellness tab */}
        {activeTab === 'wellness' && relationship.share_wellness && (
          <div className="space-y-2">
            {wellness.map(w => (
              <div key={w.log_date} className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-600 mb-2">
                  {new Date(w.log_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: '💤 Sleep', value: w.sleep ? `${w.sleep}h` : '—' },
                    { label: '⚡ Energy', value: w.energy ? `${w.energy}/10` : '—' },
                    { label: '😊 Mood', value: w.mood ? `${w.mood}/10` : '—' },
                    { label: '💪 Sore', value: w.soreness ? `${w.soreness}/10` : '—' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-400">{item.label}</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message tab */}
        {activeTab === 'message' && (
          <CoachMessageThread
            coachId={coachId}
            athleteId={athleteId}
            coachName={name}
            onClose={() => setActiveTab('overview')}
            isCoach
          />
        )}
      </div>

      {/* Annotate modal */}
      {showAnnotate && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAnnotate(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
            <h2 className="text-base font-black text-slate-900">Leave a note for {name}</h2>

            {/* Reaction */}
            <div className="flex gap-2">
              {[
                { id: 'great',   label: '🌟 Great' },
                { id: 'good',    label: '👍 Good' },
                { id: 'concern', label: '⚠️ Concern' },
                { id: 'flag',    label: '🚩 Flag' },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setAnnotateReaction(r.id === annotateReaction ? '' : r.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    annotateReaction === r.id ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={annotateNote}
              onChange={e => setAnnotateNote(e.target.value)}
              placeholder="Your coaching note — the athlete will see this in their Today tab…"
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 resize-none"
            />

            {annotateSuccess ? (
              <div className="w-full bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold text-center">
                ✓ Note sent!
              </div>
            ) : (
              <button
                onClick={sendAnnotation}
                disabled={!annotateNote.trim() || annotating}
                className="w-full bg-teal-500 text-white py-3.5 rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95"
              >
                {annotating ? 'Sending…' : 'Send note to athlete →'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
