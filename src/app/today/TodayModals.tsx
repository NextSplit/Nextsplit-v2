'use client'

import FocusMode from '@/components/FocusMode'
import LogModal from '@/components/LogModal'
import MilestoneShareCard from '@/components/MilestoneShareCard'
import ShareSessionCard from '@/components/ShareSessionCard'
import AdHocSessionModal from '@/components/AdHocSessionModal'
import PlanCompletionCeremony from '@/components/PlanCompletionCeremony'
import { getSessionXP } from '@/lib/rpg'
import type { PlanSession, TrainingLog, UserPlan, PlanWeek } from '@/types/database'
import { computeStreak } from '@/lib/streak'

interface ModalSession {
  session:            PlanSession
  dayI:               number
  sessI:              number
  prefillDurationSecs?: number
}

interface Props {
  plan:             UserPlan | null
  weeks:            PlanWeek[]
  weekN:            number
  planDayIndex:     number
  logs:             Record<string, TrainingLog>
  modalSession:     ModalSession | null
  focusSession:     { session: PlanSession; dayI: number; sessI: number } | null
  shareSession:     { session: PlanSession; log: TrainingLog } | null
  showWeeklyShare:  boolean
  showAdHocModal:   boolean
  ceremonyDismissed: boolean
  undoInfo:         { logId: string; timer: ReturnType<typeof setTimeout> } | null
  undoLabel:        string
  undoXP:           number
  undoSecsLeft:     number
  newPB:            { distance: string; timeStr: string } | null
  doneTodayCount:   number
  todaySessions:    PlanSession[]
  // Setters
  setModalSession:  (s: ModalSession | null) => void
  setFocusSession:  (s: { session: PlanSession; dayI: number; sessI: number } | null) => void
  setShareSession:  (s: { session: PlanSession; log: TrainingLog } | null) => void
  setShowWeeklyShare: (v: boolean) => void
  setShowAdHocModal:  (v: boolean) => void
  setCeremonyDismissed: (v: boolean) => void
  handleUndo:       () => void
  // Promise<unknown> so the prop accepts both Promise<void> (TrainClient's
  // inline handler) and Promise<TrainingLog | null> (TodayClient's
  // useSessionLogging hook return). Consumers await but discard the result.
  handleLogSession: (params: { week_n: number; day_i: number; session_i: number; done: boolean; effort?: number; km?: number; notes?: string; duration_secs?: number; hr?: number; pace?: string }) => Promise<unknown>
  toastSuccess:     (msg: string) => void
  runnerColour?:    string
}

export function TodayModals({
  plan, weeks, weekN, planDayIndex, logs,
  modalSession, focusSession, shareSession, showWeeklyShare,
  showAdHocModal, ceremonyDismissed,
  undoInfo, undoLabel, undoXP, undoSecsLeft, newPB,
  doneTodayCount, todaySessions,
  setModalSession, setFocusSession, setShareSession,
  setShowWeeklyShare, setShowAdHocModal, setCeremonyDismissed,
  handleUndo, handleLogSession, toastSuccess, runnerColour,
}: Props) {
  return (
    <>
      {/* Undo toast with countdown */}
      {undoInfo && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50 animate-slide-up" role="status" aria-live="polite" aria-atomic="true">
          <div className="bg-[var(--color-surface)] text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">✓ <span className="font-medium">{undoLabel}</span></span>
                <span className="text-xs font-bold text-[#34D399] bg-[#34D399]/10 px-2 py-0.5 rounded-full">
                  +{undoXP} XP
                </span>
              </div>
              <div className="h-0.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${(undoSecsLeft / 8) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 ml-5 shrink-0">
              <button
                onClick={() => shareSession && setShareSession(shareSession)}
                className="text-sm font-bold text-blue-400"
              >
                Share
              </button>
              <button onClick={handleUndo} className="text-sm font-bold text-[#34D399]">
                Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PB Toast */}
      {newPB && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-50 pointer-events-none">
          <div className="relative animate-slide-up">
            <span className="absolute top-0 left-1/2 w-2 h-2 rounded-sm bg-yellow-400 opacity-0" style={{ animation: 'confetti-fall-1 0.8s 0.1s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0" style={{ animation: 'confetti-fall-2 0.8s 0.15s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-2 h-1 rounded-sm bg-[var(--ns-cyan-mid)] opacity-0" style={{ animation: 'confetti-fall-3 0.9s 0.05s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 opacity-0" style={{ animation: 'confetti-fall-4 0.85s 0.2s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-1 h-2 rounded-sm bg-red-400 opacity-0" style={{ animation: 'confetti-fall-5 0.75s 0.1s ease-out forwards' }} />
            <span className="absolute top-0 left-1/2 w-2 h-1 rounded-full bg-orange-400 opacity-0" style={{ animation: 'confetti-fall-6 0.9s 0.0s ease-out forwards' }} />
            <div className="rounded-2xl px-4 py-3 shadow-2xl" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-bounce">🏆</span>
                <div>
                  <div className="text-sm font-black tracking-wide">New Personal Best!</div>
                  <div className="text-xs font-semibold opacity-90">{newPB.distance} · {newPB.timeStr}</div>
                </div>
                <div className="ml-auto text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">PB ✓</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Focus mode */}
      {focusSession && plan && (
        <FocusMode
          session={focusSession.session}
          isLogged={!!logs[`${weekN}_${focusSession.dayI}_${focusSession.sessI}`]?.done}
          onClose={() => setFocusSession(null)}
          onLog={(elapsedSecs) => {
            setFocusSession(null)
            setModalSession({ ...focusSession, prefillDurationSecs: elapsedSecs })
          }}
        />
      )}

      {/* Log modal */}
      {modalSession && plan && (
        <LogModal
          session={modalSession.session}
          dayIndex={modalSession.dayI}
          sessionIndex={modalSession.sessI}
          weekN={weekN}
          planId={plan.id}
          existingLog={logs[`${weekN}_${modalSession.dayI}_${modalSession.sessI}`] ?? null}
          prefillDurationSecs={modalSession.prefillDurationSecs}
          onClose={() => setModalSession(null)}
          onSave={handleLogSession}
        />
      )}

      {/* Weekly share card modal — server-side @vercel/og pipeline (BL-D1).
          Replaces the legacy client-canvas WeeklyShareCard which silently
          no-op'd CSS-var fillStyles. */}
      {showWeeklyShare && plan && (() => {
        const kmLogged = Object.values(logs).filter(l => l.done && l.week_n === weekN).reduce((a, l) => a + (l.km ?? 0), 0)
        const streak   = computeStreak(Object.values(logs)).current
        const xpEarned = Object.values(logs).filter(l => l.done && l.week_n === weekN).reduce((a, l) => {
          const w = weeks.find(wk => wk.n === l.week_n)
          const s = w?.days[l.day_i]?.sessions[l.session_i]
          return a + getSessionXP(s?.c ?? 'run-easy')
        }, 0)
        return (
          <MilestoneShareCard
            variant="weekly"
            headline={`Week ${weekN}`}
            sub={plan.name}
            alt={`Week ${weekN} of ${plan.total_weeks}: ${doneTodayCount} of ${todaySessions.length} sessions done, ${Math.round(kmLogged)}km logged, ${streak}-day streak`}
            accent="cyan"
            sessionsDone={doneTodayCount}
            sessionsPlanned={todaySessions.length}
            km={kmLogged}
            streak={streak}
            xp={xpEarned}
            weekN={weekN}
            totalWeeks={plan.total_weeks}
            shareText={`Week ${weekN} done — ${doneTodayCount}/${todaySessions.length} sessions · ${Math.round(kmLogged)}km 🏃 #NextSplit`}
            onClose={() => setShowWeeklyShare(false)}
          />
        )
      })()}

      {/* Share session card modal */}
      {shareSession && (
        <ShareSessionCard
          session={shareSession.session}
          log={shareSession.log}
          weekN={weekN}
          onClose={() => setShareSession(null)}
          runnerColour={runnerColour}
        />
      )}

      {/* Ad-hoc session modal */}
      {showAdHocModal && plan && (
        <AdHocSessionModal
          planId={plan.id}
          weekN={weekN}
          dayIndex={planDayIndex}
          onClose={() => setShowAdHocModal(false)}
          onSaved={() => { setShowAdHocModal(false); toastSuccess('Session added ✓') }}
        />
      )}

      {/* Plan completion ceremony */}
      {plan?.status === 'completed' && !ceremonyDismissed && (
        <PlanCompletionCeremony
          plan={plan}
          logs={logs}
          onClose={() => setCeremonyDismissed(true)}
        />
      )}
    </>
  )
}
