'use client'

/**
 * Plan Build Handshake — Phase B4
 *
 * Athlete-facing intake form. Captures everything a coach needs before building.
 * 4 stages visible to athlete:
 *   1. Intake submitted → 2. Coach reviewing → 3. Plan building → 4. Plan ready
 *
 * Lives at /coach/plan-request?coach=[coachId]
 * After submission, athlete sees progress stages until coach delivers.
 */

import { useState } from 'react'
import Link from 'next/link'

type Stage = 'form' | 'submitted' | 'reviewing' | 'building' | 'ready'

const GOALS = [
  '5K', '10K', '10 Miles', 'Half Marathon', 'Marathon', 'Ultra', 'General Fitness'
]
const LEVELS = [
  { id: 'beginner',     label: 'Beginner',     desc: 'New or returning to running' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Regular runner, some race experience' },
  { id: 'advanced',     label: 'Advanced',     desc: 'Competitive, chasing PBs' },
]

interface IntakeData {
  goal:          string
  level:         string
  weeklyKm:      string
  targetTime:    string
  raceDate:      string
  trainingDays:  string
  injuryNotes:   string
  context:       string
  previousPlan:  string
}

const EMPTY: IntakeData = {
  goal: '', level: '', weeklyKm: '', targetTime: '',
  raceDate: '', trainingDays: '4', injuryNotes: '', context: '', previousPlan: '',
}

const STAGE_LABELS = [
  { id: 'submitted', label: 'Intake received',  emoji: '📋', done: true  },
  { id: 'reviewing', label: 'Coach reviewing',  emoji: '👀', done: false },
  { id: 'building',  label: 'Plan building',    emoji: '🏗️', done: false },
  { id: 'ready',     label: 'Plan ready',       emoji: '✅', done: false },
]

export default function PlanRequestClient({ coachId, coachName }: { coachId: string; coachName: string }) {
  const [stage, setStage]     = useState<Stage>('form')
  const [data, setData]       = useState<IntakeData>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')

  function update(field: keyof IntakeData, value: string) {
    setData(d => ({ ...d, [field]: value }))
  }

  const canSubmit = data.goal && data.level && data.weeklyKm && data.trainingDays

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const body = `**Bespoke plan request**\n\n` +
        `Goal: ${data.goal}\n` +
        `Level: ${data.level}\n` +
        `Current weekly km: ${data.weeklyKm}km\n` +
        `Training days/week: ${data.trainingDays}\n` +
        (data.raceDate   ? `Race date: ${data.raceDate}\n` : '') +
        (data.targetTime ? `Target time: ${data.targetTime}\n` : '') +
        (data.previousPlan ? `Previous training: ${data.previousPlan}\n` : '') +
        (data.injuryNotes  ? `Injuries/niggles: ${data.injuryNotes}\n` : '') +
        (data.context ? `Additional context: ${data.context}` : '')

      await fetch('/api/coach/message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ coach_id: coachId, athlete_id: 'self', body }),
      })
      setStage('submitted')
    } catch {
      setError('Failed to send — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (stage !== 'form') {
    const currentIdx = STAGE_LABELS.findIndex(s => s.id === stage)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: '#f8f8f6' }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-3">📋</div>
            <h1 className="text-xl font-black text-gray-900">Intake submitted</h1>
            <p className="text-sm text-gray-500 mt-1">
              {coachName} will review your request and start building.
            </p>
          </div>

          {/* Stage progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            {STAGE_LABELS.map((s, i) => {
              const isDone    = i < currentIdx
              const isCurrent = i === currentIdx
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    isDone    ? 'bg-emerald-100 text-emerald-700' :
                    isCurrent ? 'text-white' : 'bg-gray-100 text-gray-400'
                  }`} style={isCurrent ? { background: 'var(--ns-ember)' } : {}}>
                    {isDone ? '✓' : s.emoji}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${
                      isDone ? 'text-emerald-700' : isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}>{s.label}</p>
                    {isCurrent && (
                      <p className="text-xs text-gray-500">In progress…</p>
                    )}
                  </div>
                  {isCurrent && (
                    <div className="ml-auto w-4 h-4 rounded-full border-2 border-t-transparent border-[var(--ns-ember)] animate-spin" />
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-center text-xs text-gray-400">
            You'll get a message when your plan is ready. Usually within 24–48 hours.
          </p>

          <Link href="/today"
            className="block w-full py-3 rounded-2xl text-center text-sm font-bold text-white"
            style={{ background: 'var(--ns-ember)' }}>
            Back to training →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#f8f8f6' }}>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div>
          <Link href="/today" className="text-sm font-semibold" style={{ color: 'var(--ns-violet)' }}>← Back</Link>
          <h1 className="text-2xl font-black text-gray-900 mt-3">Request a bespoke plan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {coachName} will use this to build a plan tailored to you. Be specific — the more detail, the better the plan.
          </p>
        </div>

        {/* Goal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Primary goal *</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button key={g}
                onClick={() => update('goal', g)}
                className={`text-xs px-3 py-2 rounded-xl border-2 font-semibold transition-all ${
                  data.goal === g
                    ? 'text-white border-transparent'
                    : 'border-gray-200 text-gray-600'
                }`}
                style={data.goal === g ? { background: 'var(--ns-ember)', borderColor: 'var(--ns-violet)' } : {}}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Experience level *</p>
          <div className="space-y-2">
            {LEVELS.map(l => (
              <button key={l.id}
                onClick={() => update('level', l.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  data.level === l.id ? 'border-[var(--ns-ember)] bg-[var(--ns-violet-light)]' : 'border-gray-200'
                }`}
              >
                <p className="text-sm font-bold text-gray-900">{l.label}</p>
                <p className="text-xs text-gray-500">{l.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Numbers */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Training details *</p>
          {[
            { label: 'Current weekly km',  field: 'weeklyKm',     placeholder: 'e.g. 30',       type: 'number' },
            { label: 'Training days/week', field: 'trainingDays', placeholder: 'e.g. 4',        type: 'number' },
            { label: 'Target time',        field: 'targetTime',   placeholder: 'e.g. 3:45 marathon', type: 'text' },
            { label: 'Race date',          field: 'raceDate',     placeholder: '',               type: 'date'   },
          ].map(f => (
            <div key={f.field}>
              <label className="text-xs text-gray-500 font-semibold block mb-1">{f.label}</label>
              <input
                type={f.type}
                value={data[f.field as keyof IntakeData]}
                onChange={e => update(f.field as keyof IntakeData, e.target.value)}
                placeholder={f.placeholder}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[var(--ns-ember)]"
              />
            </div>
          ))}
        </div>

        {/* Context */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Background</p>
          {[
            { label: 'Previous training / what worked / what didn\'t', field: 'previousPlan', rows: 2 },
            { label: 'Injuries, niggles or health notes', field: 'injuryNotes', rows: 2 },
            { label: 'Anything else the coach should know', field: 'context', rows: 3 },
          ].map(f => (
            <div key={f.field}>
              <label className="text-xs text-gray-500 font-semibold block mb-1">{f.label}</label>
              <textarea
                value={data[f.field as keyof IntakeData]}
                onChange={e => update(f.field as keyof IntakeData, e.target.value)}
                rows={f.rows}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[var(--ns-ember)] resize-none"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full py-4 rounded-2xl text-white text-sm font-bold disabled:opacity-40 transition-all active:scale-[0.98]"
          style={{ background: 'var(--ns-ember)' }}
        >
          {submitting ? 'Sending to coach…' : 'Send intake to coach →'}
        </button>

        <p className="text-center text-xs text-gray-400">
          Your coach will respond within 24–48 hours.
        </p>
      </div>
    </div>
  )
}
