'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useGymLog, type GymExercise } from '@/hooks/useGymLog'
import { parseDetToExercises, suggestWeight, getRestTime, type ExerciseDef } from '@/lib/gymUtils'
import { getSessionXP } from '@/lib/rpg'
import { useToast } from '@/components/Toast'
import { hapticSuccess } from '@/lib/haptics'
import type { PlanSession } from '@/types/database'

// ─── Rest Timer ───────────────────────────────────────────────────────────────

function RestTimer({ secs, onDone }: { secs: number; onDone: () => void }) {
  const [left, setLeft] = useState(secs)

  useEffect(() => {
    setLeft(secs)
    const id = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(id); onDone(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [secs, onDone])

  const pct = (left / secs) * 100
  const mins = Math.floor(left / 60)
  const s = left % 60

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0D9488" strokeWidth="2.5"
            strokeDasharray={`${pct} 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-gray-900">
            {mins > 0 ? `${mins}:${s.toString().padStart(2,'0')}` : s}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 font-medium">Rest · breathe</p>
      <button
        onClick={onDone}
        className="text-xs text-[#0D9488] font-semibold px-4 py-1.5 bg-teal-50 rounded-full"
      >
        Skip rest →
      </button>
    </div>
  )
}

// ─── Set log row ──────────────────────────────────────────────────────────────

function SetRow({
  idx, weight, reps, onEdit
}: { idx: number; weight: number | null; reps: number; onEdit: () => void }) {
  return (
    <div
      onClick={onEdit}
      className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer"
    >
      <span className="text-xs font-semibold text-emerald-700">Set {idx + 1}</span>
      <div className="flex items-center gap-3">
        {weight != null && weight > 0 && (
          <span className="text-sm font-bold text-gray-900">{weight}kg</span>
        )}
        <span className="text-sm font-bold text-gray-900">{reps} reps</span>
        <span className="text-xs text-emerald-500">✓</span>
      </div>
    </div>
  )
}

// ─── Weight + reps input ──────────────────────────────────────────────────────

function SetInput({
  exercise, suggWeight, onLog, onSkip
}: {
  exercise: ExerciseDef
  suggWeight: number | null
  onLog: (weight: number | null, reps: number) => void
  onSkip: () => void
}) {
  const [weight, setWeight] = useState<string>(suggWeight != null ? String(suggWeight) : '')
  const [reps, setReps] = useState<string>(exercise.reps.replace(/[^0-9]/g, '') || '8')
  const needsWeight = !/core|band|walk|nordic|bodyweight|bw/i.test(exercise.name)

  function handleLog() {
    const r = parseInt(reps)
    if (!r || r < 1) return
    const w = needsWeight ? (parseFloat(weight) || null) : null
    onLog(w, r)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {needsWeight && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Weight (kg)</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeight(w => String(Math.max(0, parseFloat(w || '0') - 2.5)))}
                className="w-9 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >−</button>
              <input
                type="number" inputMode="decimal"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder={suggWeight != null ? String(suggWeight) : '0'}
                className="flex-1 h-10 text-center text-base font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
              <button
                onClick={() => setWeight(w => String(parseFloat(w || '0') + 2.5))}
                className="w-9 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
              >+</button>
            </div>
            {suggWeight != null && (
              <p className="text-[10px] text-gray-400 text-center mt-1">Last session: {suggWeight}kg</p>
            )}
          </div>
        )}
        <div className={needsWeight ? '' : 'col-span-2'}>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Reps</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setReps(r => String(Math.max(1, parseInt(r || '1') - 1)))}
              className="w-9 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
            >−</button>
            <input
              type="number" inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="flex-1 h-10 text-center text-base font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
            <button
              onClick={() => setReps(r => String(parseInt(r || '0') + 1))}
              className="w-9 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center"
            >+</button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1">Target: {exercise.reps}</p>
        </div>
      </div>

      <button
        onClick={handleLog}
        className="w-full py-4 bg-[#0D9488] text-white rounded-2xl text-base font-bold active:scale-95 transition-transform"
      >
        Log set ✓
      </button>

      <button onClick={onSkip} className="w-full text-center text-xs text-gray-400 py-1">
        Skip exercise →
      </button>
    </div>
  )
}

// ─── Finish modal ─────────────────────────────────────────────────────────────

function FinishModal({
  exercises, onConfirm, onCancel
}: {
  exercises: GymExercise[]
  onConfirm: () => void
  onCancel: () => void
}) {
  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Finish session?</h2>
        <p className="text-sm text-gray-500 mb-5">
          {exercises.filter(e => e.sets.length > 0).length} exercises · {totalSets} sets logged
        </p>
        <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
          {exercises.filter(e => e.sets.length > 0).map((ex, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-gray-700 font-medium">{ex.name}</span>
              <span className="text-gray-400">{ex.sets.length} sets</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
            Keep going
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-semibold">
            Save & finish
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Gym Live Component ──────────────────────────────────────────────────

interface Props {
  weekN: number
  dayIndex: number
  sessionIndex: number
  session: PlanSession
  onDone: () => void
}

export default function GymLiveClient({ weekN, dayIndex, sessionIndex, session, onDone }: Props) {
  const { plan, weeks } = useActivePlan()
  const { logSession } = useTrainingLog(plan?.id ?? null)
  const { gymLogs, saveGymLog } = useGymLog(plan?.id ?? null)
  const { error: toastError } = useToast()

  // Parse exercises from plan det string
  const exercises = parseDetToExercises(session.det, session.c)

  // State
  const [exIdx, setExIdx] = useState(0)
  const [targetSets, setTargetSets] = useState<number[]>(exercises.map(e => e.sets))
  const [logged, setLogged] = useState<GymExercise[]>(exercises.map(e => ({ name: e.name, sets: [] })))
  const [resting, setResting] = useState(false)
  const [restSecs, setRestSecs] = useState(90)
  const [showFinish, setShowFinish] = useState(false)
  const [editSetIdx, setEditSetIdx] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const startTime = useRef(Date.now())

  const currentEx = exercises[exIdx]
  const currentLogged = logged[exIdx]
  const doneSetCount = currentLogged?.sets.length ?? 0
  const targetSetCount = targetSets[exIdx] ?? currentEx?.sets ?? 3
  const allSetsLogged = doneSetCount >= targetSetCount

  // Previous gym log for weight suggestions
  const prevLogKey = Object.keys(gymLogs)
    .filter(k => k !== `${weekN}_${dayIndex}_${sessionIndex}`)
    .sort()
    .reverse()[0]
  const prevLog = prevLogKey ? gymLogs[prevLogKey] : null
  const prevExercises = (prevLog?.exercises as unknown as GymExercise[]) ?? []

  const currentSuggWeight = suggestWeight(currentEx?.name ?? '', prevExercises)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function logSet(weight: number | null, reps: number) {
    const set = { weight, reps, ts: new Date().toISOString() }
    setLogged(prev => {
      const next = [...prev]
      next[exIdx] = { ...next[exIdx], sets: [...next[exIdx].sets, set] }
      return next
    })
    // Start rest timer
    const rest = getRestTime(currentEx.name)
    setRestSecs(rest)
    setResting(true)
  }

  function handleRestDone() {
    setResting(false)
    // Auto-advance if all sets done
    if (doneSetCount + 1 >= targetSetCount && exIdx < exercises.length - 1) {
      // Don't auto-advance — let user tap Next
    }
  }

  function nextExercise() {
    setResting(false)
    if (exIdx < exercises.length - 1) {
      setExIdx(i => i + 1)
    } else {
      setShowFinish(true)
    }
  }

  function prevExercise() {
    setResting(false)
    if (exIdx > 0) setExIdx(i => i - 1)
  }

  function editLastSet() {
    if (!currentLogged.sets.length) return
    setEditSetIdx(currentLogged.sets.length - 1)
  }

  function updateSet(idx: number, weight: number | null, reps: number) {
    setLogged(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[idx] = { weight, reps, ts: sets[idx].ts }
      next[exIdx] = { ...next[exIdx], sets }
      return next
    })
    setEditSetIdx(null)
  }

  const handleFinish = useCallback(async () => {
    if (!plan || saved) return
    setSaved(true)

    const duration = Math.round((Date.now() - startTime.current) / 1000)
    const nonEmpty = logged.filter(e => e.sets.length > 0)

    try {
      await saveGymLog({
        plan_id: plan.id,
        week_n: weekN,
        day_i: dayIndex,
        session_i: sessionIndex,
        exercises: nonEmpty,
      })

      await logSession({
        plan_id: plan.id,
        week_n: weekN,
        day_i: dayIndex,
        session_i: sessionIndex,
        done: true,
        duration_secs: duration,
      })

      hapticSuccess()
      setShowCelebration(true)
      setTimeout(() => onDone(), 2500)
    } catch {
      toastError('Session logged but some data may not have saved — check your connection')
      onDone()
    }
  }, [plan, saved, logged, saveGymLog, logSession, weekN, dayIndex, sessionIndex, onDone])

  if (!currentEx) return (
    <div className="fixed inset-0 z-[100] bg-[#f8f8f6] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🏋️</div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">No exercises found</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Couldn&apos;t parse exercises from this session. You can still log it as complete.
      </p>
      <button
        onClick={async () => {
          if (plan) {
            try {
              await logSession({
                plan_id: plan.id, week_n: weekN, day_i: dayIndex,
                session_i: sessionIndex, done: true,
                duration_secs: Math.round((Date.now() - startTime.current) / 1000),
              })
              hapticSuccess()
            } catch {
              toastError('Could not save session — check your connection')
            }
          }
          onDone()
        }}
        className="w-full max-w-xs py-3 bg-[#0D9488] text-white rounded-xl text-sm font-semibold"
      >
        Mark as done
      </button>
      <button onClick={onDone} className="mt-3 text-sm text-gray-400">Go back</button>
    </div>
  )

  const xp = getSessionXP(session.c)

  return (
    <div className="fixed inset-0 z-[100] bg-[#f8f8f6] flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex-shrink-0">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setShowFinish(true)} className="text-xs text-gray-400 font-medium">
              ← Back
            </button>
            <span className="text-xs font-semibold text-gray-900">{session.n}</span>
            <button
              onClick={() => setShowFinish(true)}
              className="text-xs font-semibold text-[#0D9488]"
            >
              Finish
            </button>
          </div>

          {/* Exercise progress dots */}
          <div className="flex gap-1.5">
            {exercises.map((_, i) => {
              const exDone = logged[i]?.sets.length >= (targetSets[i] ?? exercises[i].sets)
              return (
                <button
                  key={i}
                  onClick={() => { setResting(false); setExIdx(i) }}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i === exIdx ? 'bg-[#0D9488]' :
                    exDone ? 'bg-emerald-300' :
                    i < exIdx ? 'bg-gray-300' : 'bg-gray-100'
                  }`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Exercise {exIdx + 1} of {exercises.length}</span>
            <span>+{xp} XP on finish</span>
          </div>
        </div>
      </div>

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

          {/* Exercise name card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#0D9488] uppercase tracking-wide mb-1">
                  {session.c === 'gym-a' ? 'Lower body' : session.c === 'gym-b' ? 'Upper body' : 'Recovery'}
                </div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">{currentEx.name}</h2>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <div className="text-2xl font-black text-[#0D9488]">{doneSetCount}</div>
                <div className="text-xs text-gray-400">/{targetSetCount} sets</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Target: {targetSetCount}×{currentEx.reps}</div>

            {/* Adjust sets */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-400">Sets:</span>
              <button
                onClick={() => setTargetSets(prev => { const n=[...prev]; n[exIdx]=Math.max(1,n[exIdx]-1); return n })}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center"
              >−</button>
              <span className="text-sm font-bold text-gray-900 w-6 text-center">{targetSetCount}</span>
              <button
                onClick={() => setTargetSets(prev => { const n=[...prev]; n[exIdx]=n[exIdx]+1; return n })}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center"
              >+</button>
              <span className="text-xs text-gray-400 ml-1">adjust target</span>
            </div>
          </div>

          {/* Logged sets */}
          {currentLogged.sets.length > 0 && (
            <div className="space-y-2">
              {currentLogged.sets.map((set, i) => (
                <SetRow
                  key={i} idx={i}
                  weight={set.weight} reps={set.reps}
                  onEdit={() => setEditSetIdx(i)}
                />
              ))}
            </div>
          )}

          {/* Rest timer or set input */}
          {resting ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <RestTimer secs={restSecs} onDone={handleRestDone} />
              {/* Edit last set during rest */}
              <button
                onClick={editLastSet}
                className="w-full text-center text-xs text-gray-400 mt-2"
              >
                Edit last set
              </button>
            </div>
          ) : allSetsLogged ? (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm font-bold text-emerald-700">All sets done!</p>
              {exIdx < exercises.length - 1 ? (
                <button
                  onClick={nextExercise}
                  className="mt-3 w-full py-3 bg-[#0D9488] text-white rounded-xl text-sm font-bold"
                >
                  Next exercise →
                </button>
              ) : (
                <button
                  onClick={() => setShowFinish(true)}
                  className="mt-3 w-full py-3 bg-[#0D9488] text-white rounded-xl text-sm font-bold"
                >
                  Finish session 🎉
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-xs font-semibold text-gray-500 mb-3">
                Set {doneSetCount + 1} of {targetSetCount}
              </div>
              <SetInput
                exercise={currentEx}
                suggWeight={currentSuggWeight}
                onLog={logSet}
                onSkip={nextExercise}
              />
            </div>
          )}

          {/* Edit set modal */}
          {editSetIdx !== null && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <div className="text-sm font-bold text-gray-900 mb-3">Edit Set {editSetIdx + 1}</div>
              <SetInput
                exercise={currentEx}
                suggWeight={currentLogged.sets[editSetIdx]?.weight ?? null}
                onLog={(w, r) => updateSet(editSetIdx, w, r)}
                onSkip={() => setEditSetIdx(null)}
              />
            </div>
          )}

        </div>
      </div>

      {/* Bottom nav between exercises */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={prevExercise}
            disabled={exIdx === 0}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            onClick={nextExercise}
            className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold"
          >
            {exIdx < exercises.length - 1 ? 'Next →' : 'Finish 🎉'}
          </button>
        </div>
      </div>

      {/* Finish modal */}
      {showFinish && (
        <FinishModal
          exercises={logged}
          onConfirm={handleFinish}
          onCancel={() => setShowFinish(false)}
        />
      )}

      {showCelebration && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-slide-up"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d3d38 100%)' }}>
          <div className="text-7xl mb-5 animate-bounce">🏋️</div>
          <h2 className="text-3xl font-black text-white mb-2">Session done!</h2>
          <p className="text-teal-300 text-base mb-8">{session.n}</p>
          <div className="flex gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-black text-white">
                {logged.filter(e => e.sets.length > 0).length}
              </div>
              <div className="text-teal-400 text-xs mt-0.5">exercises</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white">
                {logged.reduce((a, e) => a + e.sets.length, 0)}
              </div>
              <div className="text-teal-400 text-xs mt-0.5">sets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">+{getSessionXP(session.c)}</div>
              <div className="text-teal-400 text-xs mt-0.5">XP</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
                style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
