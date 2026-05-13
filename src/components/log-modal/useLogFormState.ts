'use client'

// Form state lifted out of LogModal.tsx (council /council 2026-05-07 P1.0
// decomposition L1, ux-designer R1 prerequisite).
//
// The original DiscardWarning dirty-check at LogModal.tsx:84 only compared
// notes and paceInput against existingLog. Lifting form state was treated
// as a precondition for splitting BasicEntry/AdvancedEntry sub-components —
// once km / duration / effort live in child components, the dirty-check
// can no longer reach them.
//
// This hook is the single owner of form state. The dirty check now covers
// every field that round-trips into onSave. Sub-components added in L2
// receive setters as props from the LogModal; isDirty stays computed at
// the LogModal level where the close-handler runs.

import { useState, useMemo } from 'react'
import type { PlanSession, TrainingLog } from '@/types/database'

interface Inputs {
  session:             PlanSession
  existingLog:         TrainingLog | null
  prefillDurationSecs?: number
}

export type PacingFeel = 'too-easy' | 'spot-on' | 'too-hard' | null

// Session-type aware default RPE. Founder UX audit: previous flat default
// of 7 felt high for most sessions (the user has to slide it down before
// confirming, defeating "one-tap done"). Anchor each type to its typical
// perceived effort instead.
function defaultEffortFor(code: string | null | undefined): number {
  const c = (code ?? '').toLowerCase()
  if (c.includes('recovery'))                          return 3
  if (c.includes('easy'))                              return 4
  if (c.includes('long') || c.includes('steady'))      return 6
  if (c.includes('tempo'))                             return 7
  if (c.includes('threshold') || c.includes('interval') || c.includes('speed')) return 8
  if (c.includes('race'))                              return 9
  return 5
}

export function useLogFormState({ session, existingLog, prefillDurationSecs }: Inputs) {
  const initialDurationMins =
    existingLog?.duration_secs ? Math.round(existingLog.duration_secs / 60)
    : prefillDurationSecs       ? Math.round(prefillDurationSecs / 60) : 0

  const initialEffort = existingLog?.effort ?? defaultEffortFor(session.c)

  const [effort,         setEffort]         = useState(initialEffort)
  const [km,             setKm]             = useState(existingLog?.km ?? session.km ?? 0)
  const [notes,          setNotes]          = useState(existingLog?.notes ?? '')
  const [durationMins,   setDurationMins]   = useState(initialDurationMins)
  const [paceInput,      setPaceInput]      = useState(existingLog?.pace ?? '')
  const [repsCompleted,  setRepsCompleted]  = useState<number | null>(null)
  const [pacingFeel,     setPacingFeel]     = useState<PacingFeel>(null)
  const [feelRating,     setFeelRating]     = useState<number>(3)
  const [showExtra,      setShowExtra]      = useState<boolean>(!!existingLog)

  const isDirty = useMemo(() => {
    if (notes.trim()      !== (existingLog?.notes  ?? ''))                    return true
    if (paceInput         !== (existingLog?.pace   ?? ''))                    return true
    if (km                !== (existingLog?.km     ?? session.km ?? 0))       return true
    if (durationMins      !== initialDurationMins)                            return true
    if (effort            !== initialEffort)                                  return true
    if (repsCompleted     !== null)                                           return true
    if (pacingFeel        !== null)                                           return true
    return false
  }, [
    notes, paceInput, km, durationMins, effort, repsCompleted, pacingFeel,
    existingLog, session.km, initialDurationMins, initialEffort,
  ])

  return {
    effort,        setEffort,
    km,            setKm,
    notes,         setNotes,
    durationMins,  setDurationMins,
    paceInput,     setPaceInput,
    repsCompleted, setRepsCompleted,
    pacingFeel,    setPacingFeel,
    feelRating,    setFeelRating,
    showExtra,     setShowExtra,
    isDirty,
  }
}
