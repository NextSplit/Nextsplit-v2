'use client'

// Undo state machine extracted from TodayClient.tsx (council /council
// 2026-05-07 P1.0 decomposition T1). The original pattern carried a
// stale-closure smell — the countdown interval captured undoInfo through
// the dep array, and the clear-on-date-change effect reached for the
// closure value of undoInfo via an eslint-disable.
//
// Fix: a ref tracks the current undoInfo; effects that need to read
// "what's the latest undo state without retriggering" use the ref. The
// dep array stays exhaustive so eslint-plugin-react-hooks/exhaustive-deps
// (now error per 2fdaa87) won't flag any new violations.

import { useState, useEffect, useRef, useCallback } from 'react'

const UNDO_WINDOW_SECS = 8

interface UndoInfo {
  logId: string
  timer: ReturnType<typeof setTimeout>
}

export function useUndoCountdown(resetKey?: unknown) {
  const [undoInfo,    setUndoInfo]    = useState<UndoInfo | null>(null)
  const [undoLabel,   setUndoLabel]   = useState('')
  const [undoXP,      setUndoXP]      = useState(0)
  const [undoSecsLeft, setUndoSecsLeft] = useState(UNDO_WINDOW_SECS)

  // Latest-undoInfo ref so the reset effect can clear without depending
  // on undoInfo (which would re-fire the reset every time undo state
  // changes — wrong semantics).
  const undoInfoRef = useRef<UndoInfo | null>(null)
  useEffect(() => { undoInfoRef.current = undoInfo }, [undoInfo])

  // Clear on resetKey change — typically the caller's date offset.
  useEffect(() => {
    const current = undoInfoRef.current
    if (current) {
      clearTimeout(current.timer)
      setUndoInfo(null)
    }
  }, [resetKey])

  // Countdown ticker — runs while undoInfo is non-null.
  useEffect(() => {
    if (!undoInfo) return
    setUndoSecsLeft(UNDO_WINDOW_SECS)
    const interval = setInterval(() => {
      setUndoSecsLeft(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [undoInfo])

  const beginUndo = useCallback((label: string, xp: number, logId: string) => {
    setUndoInfo(prev => {
      if (prev) clearTimeout(prev.timer)
      const timer = setTimeout(() => setUndoInfo(null), UNDO_WINDOW_SECS * 1000)
      return { logId, timer }
    })
    setUndoLabel(label)
    setUndoXP(xp)
  }, [])

  const cancelUndo = useCallback(() => {
    setUndoInfo(prev => {
      if (prev) clearTimeout(prev.timer)
      return null
    })
  }, [])

  return {
    undoInfo,
    undoLabel,
    undoXP,
    undoSecsLeft,
    beginUndo,
    cancelUndo,
  }
}
