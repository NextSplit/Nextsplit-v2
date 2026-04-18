'use client'

import { useEffect } from 'react'
import { getSessionType } from '@/lib/sessionUtils'
import type { PlanSession } from '@/types/database'

function decodeHtml(str: string): string {
  return str
    .replace(/&middot;/g, '·')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

interface Props {
  session: PlanSession
  onClose: () => void
  onLog: () => void
  isLogged: boolean
}

export default function FocusMode({ session, onClose, onLog, isLogged }: Props) {
  const cfg = getSessionType(session.c)

  // Lock scroll while focus mode is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Close */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-gray-500 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.colour} ${cfg.textColour}`}>
          Focus mode
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 flex flex-col justify-center">
        {/* Emoji */}
        <div className={`w-20 h-20 rounded-3xl ${cfg.colour} flex items-center justify-center text-4xl mb-8`}>
          {cfg.emoji}
        </div>

        {/* Type */}
        <div className={`text-sm font-bold uppercase tracking-widest ${cfg.textColour} mb-2`}>
          {cfg.label}
        </div>

        {/* Name */}
        <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
          {session.n}
        </h1>

        {/* km */}
        {session.km > 0 && (
          <div className="text-5xl font-black text-[#0D9488] mb-6">
            {session.km}<span className="text-2xl font-bold text-gray-400">km</span>
          </div>
        )}

        {/* Detail */}
        {session.det && (
          <p className="text-base text-gray-600 leading-relaxed">
            {decodeHtml(session.det)}
          </p>
        )}
      </div>

      {/* Bottom action */}
      <div className="px-6 pb-12 space-y-3">
        {!isLogged ? (
          <button
            onClick={onLog}
            className="w-full py-4 bg-[#0D9488] text-white rounded-2xl text-base font-bold"
          >
            Log this session
          </button>
        ) : (
          <div className="w-full py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
            <span className="text-emerald-600 font-bold text-base">✓ Logged</span>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 text-gray-400 text-sm font-medium"
        >
          Close focus mode
        </button>
      </div>
    </div>
  )
}
