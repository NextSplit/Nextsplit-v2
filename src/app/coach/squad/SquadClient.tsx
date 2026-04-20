'use client'

import { useState } from 'react'
import { useCoach } from '@/hooks/useCoach'
import type { CoachProfile } from '@/types/database'

interface Props {
  coachProfile: CoachProfile
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading]   = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied]     = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/coach/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (data.inviteUrl) setInviteUrl(data.inviteUrl)
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 space-y-4 max-w-lg mx-auto">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <h2 className="text-base font-black text-slate-900">Invite an athlete</h2>
        <p className="text-sm text-slate-500">Generate a unique invite link. Send it to your athlete via any channel — they tap it and connect to you instantly.</p>

        {!inviteUrl ? (
          <button onClick={generate} disabled={loading}
            className="w-full bg-teal-500 text-white py-3.5 rounded-2xl text-sm font-bold disabled:opacity-50">
            {loading ? 'Generating…' : 'Generate invite link →'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono break-all border border-slate-200">
              {inviteUrl}
            </div>
            <button onClick={copy}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-teal-500 text-white'}`}>
              {copied ? '✓ Copied!' : 'Copy invite link'}
            </button>
            <p className="text-xs text-slate-400 text-center">This link is single-use and expires when accepted</p>
          </div>
        )}

        <button onClick={onClose} className="w-full text-slate-400 text-sm py-2">Close</button>
      </div>
    </>
  )
}

function AthleteCard({ athlete }: { athlete: { athlete_id: string; status: string; accepted_at: string | null } }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg shrink-0">🏃</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">Athlete</p>
        <p className="text-xs text-slate-400">
          {athlete.status === 'active'
            ? `Connected ${athlete.accepted_at ? new Date(athlete.accepted_at).toLocaleDateString('en-GB') : ''}`
            : athlete.status}
        </p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
        athlete.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
        athlete.status === 'pending' ? 'bg-amber-100 text-amber-700' :
        'bg-slate-100 text-slate-500'
      }`}>
        {athlete.status}
      </span>
    </div>
  )
}

export default function SquadClient({ coachProfile }: Props) {
  const { athletes, loading, refresh } = useCoach()
  const [showInvite, setShowInvite]   = useState(false)
  const [setupDone]                   = useState(false)

  const activeAthletes  = athletes.filter(a => a.status === 'active')
  const pendingAthletes = athletes.filter(a => a.status === 'pending')

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-900">Squad</h1>
            <p className="text-xs text-slate-400">{coachProfile.display_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {coachProfile.verified && (
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-full font-bold">
                ✅ Verified
              </span>
            )}
            <button
              onClick={() => { setShowInvite(true); refresh() }}
              className="bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95"
            >
              + Invite
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active', value: activeAthletes.length, colour: 'text-emerald-600' },
            { label: 'Pending', value: pendingAthletes.length, colour: 'text-amber-600' },
            { label: 'Max', value: coachProfile.max_athletes, colour: 'text-slate-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
              <p className={`text-2xl font-black ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!loading && athletes.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="text-4xl">👥</div>
            <h2 className="text-base font-bold text-slate-800">No athletes yet</h2>
            <p className="text-sm text-slate-500">Generate an invite link and share it with your first athlete to get started.</p>
            <button
              onClick={() => setShowInvite(true)}
              className="bg-teal-500 text-white text-sm font-bold px-6 py-3 rounded-xl mt-2 active:scale-95"
            >
              Invite your first athlete →
            </button>
          </div>
        )}

        {/* Active athletes */}
        {activeAthletes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active ({activeAthletes.length})</p>
            {activeAthletes.map(a => <AthleteCard key={a.id} athlete={a} />)}
          </div>
        )}

        {/* Pending invites */}
        {pendingAthletes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending invites ({pendingAthletes.length})</p>
            {pendingAthletes.map(a => <AthleteCard key={a.id} athlete={a} />)}
          </div>
        )}

        {/* Coach profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your coach profile</p>
          <p className="text-sm text-slate-700">{coachProfile.bio ?? 'No bio added yet'}</p>
          {coachProfile.specialities && coachProfile.specialities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {coachProfile.specialities.map(s => (
                <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{s}</span>
              ))}
            </div>
          )}
          {!coachProfile.verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
              <p className="text-xs text-amber-700 font-semibold">🔓 Unverified coach</p>
              <p className="text-xs text-amber-600 mt-0.5">Apply for verification to get a ✅ badge and marketplace featuring eligibility.</p>
            </div>
          )}
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
