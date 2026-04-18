'use client'

import { useRouter } from 'next/navigation'
import { useActivePlan } from '@/hooks/useActivePlan'
import GymLiveClient from '@/app/gym/live/GymLiveClient'
import type { PlanSession } from '@/types/database'

interface Props {
  weekN: number
  dayIndex: number
  sessionIndex: number
}

export default function GymLiveWrapper({ weekN, dayIndex, sessionIndex }: Props) {
  const router = useRouter()
  const { plan, weeks, loading } = useActivePlan()

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#f8f8f6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading session…</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    router.replace('/today')
    return null
  }

  const week = weeks.find(w => w.n === weekN)
  const day = week?.days[dayIndex]
  const session = day?.sessions[sessionIndex] as PlanSession | undefined

  if (!session) {
    return (
      <div className="fixed inset-0 bg-[#f8f8f6] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-4xl mb-3">❓</div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Session not found</p>
          <p className="text-xs text-gray-400 mb-5">Week {weekN}, Day {dayIndex}, Session {sessionIndex}</p>
          <button
            onClick={() => router.replace('/today')}
            className="text-sm font-semibold text-[#0D9488]"
          >
            Back to Today
          </button>
        </div>
      </div>
    )
  }

  return (
    <GymLiveClient
      weekN={weekN}
      dayIndex={dayIndex}
      sessionIndex={sessionIndex}
      session={session}
      onDone={() => router.replace('/today')}
    />
  )
}
