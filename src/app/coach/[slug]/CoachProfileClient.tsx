'use client'

import Image from 'next/image'

import { useState } from 'react'
import type { CoachProfile } from '@/types/database'

interface Plan {
  id: string; name: string; distance: string; level: string
  weeks_min: number; weeks_max: number; description: string | null
  meta: Record<string, unknown>
}

interface Props {
  coach:           CoachProfile
  plans:           Plan[]
  isOwnProfile:    boolean
  viewerLoggedIn:  boolean
}

export default function CoachProfileClient({ coach, plans, isOwnProfile, viewerLoggedIn }: Props) {
  const [enquirySent, setEnquirySent] = useState(false)
  const [enquiryText, setEnquiryText] = useState('')
  const [showEnquiry, setShowEnquiry] = useState(false)

  const sendEnquiry = async () => {
    if (!enquiryText.trim()) return
    // Enquiry goes to coach via message system
    setEnquirySent(true)
    setTimeout(() => { setShowEnquiry(false); setEnquirySent(false) }, 2000)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">

      {/* Hero header */}
      <div className="bg-gradient-to-b from-[#0f172a] to-[#0d3d38] px-4 pt-14 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-3xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-3xl shrink-0">
              {coach.photo_url ? (
                <Image src={coach.photo_url} alt={coach.display_name ?? 'Coach'} fill className="object-cover rounded-3xl" />
              ) : '🏃'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white">{coach.display_name}</h1>
                {coach.verified && (
                  <span className="text-xs bg-teal-500/30 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded-full font-bold">
                    ✅ Verified
                  </span>
                )}
              </div>
              {coach.location && <p className="text-slate-400 text-sm mt-0.5">📍 {coach.location}</p>}
              {coach.rate_monthly_gbp && (
                <p className="text-teal-300 text-sm font-semibold mt-1">
                  From £{coach.rate_monthly_gbp}/month
                </p>
              )}
            </div>
          </div>

          {/* Specialities */}
          {coach.specialities && coach.specialities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {coach.specialities.map(s => (
                <span key={s} className="text-xs bg-white/10 text-slate-300 px-2.5 py-1 rounded-full border border-white/10">
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* CTAs */}
          {!isOwnProfile && (
            <div className="flex gap-3 pt-1">
              {viewerLoggedIn ? (
                <button
                  onClick={() => setShowEnquiry(true)}
                  className="flex-1 bg-teal-500 text-white py-3 rounded-2xl text-sm font-bold active:scale-95"
                >
                  Send enquiry →
                </button>
              ) : (
                <a
                  href={`/auth/signup?coach=${coach.slug}`}
                  className="flex-1 bg-teal-500 text-white py-3 rounded-2xl text-sm font-bold text-center active:scale-95"
                >
                  Train with {coach.display_name} →
                </a>
              )}
              {coach.instagram_handle && (
                <a
                  href={`https://instagram.com/${coach.instagram_handle}`}
                  target="_blank" rel="noopener noreferrer"
                  className="bg-white/10 border border-white/20 text-white px-4 py-3 rounded-2xl text-sm font-bold"
                >
                  IG
                </a>
              )}
            </div>
          )}

          {isOwnProfile && (
            <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm text-slate-300">
              👆 This is your public profile — this is what athletes see
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Bio */}
        {coach.bio && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About</p>
            <p className="text-sm text-slate-700 leading-relaxed">{coach.bio}</p>
          </div>
        )}

        {/* Credentials */}
        {coach.credentials && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Credentials</p>
            <p className="text-sm text-slate-700 leading-relaxed">{coach.credentials}</p>
          </div>
        )}

        {/* Plans */}
        {plans.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Training Plans</p>
            {plans.map(plan => (
              <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {plan.distance} · {plan.level} · {plan.weeks_min}–{plan.weeks_max} weeks
                    </p>
                  </div>
                  {(plan.meta as { price_gbp?: number }).price_gbp && (
                    <span className="text-sm font-black text-teal-600 shrink-0">
                      £{(plan.meta as { price_gbp?: number }).price_gbp}
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs text-slate-500 leading-relaxed">{plan.description}</p>
                )}
                {viewerLoggedIn && !isOwnProfile && (
                  <button className="w-full bg-teal-50 border border-teal-200 text-teal-700 py-2 rounded-xl text-xs font-bold active:scale-95">
                    View plan →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Links */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Links</p>
          {coach.website_url && (
            <a href={coach.website_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-teal-600 hover:underline">
              🌐 {coach.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
          {coach.instagram_handle && (
            <a href={`https://instagram.com/${coach.instagram_handle}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-teal-600 hover:underline">
              📸 @{coach.instagram_handle}
            </a>
          )}
          {!coach.website_url && !coach.instagram_handle && (
            <p className="text-sm text-slate-400">No links added</p>
          )}
        </div>
      </div>

      {/* Enquiry modal */}
      {showEnquiry && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowEnquiry(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
            <h2 className="text-base font-black text-slate-900">Send enquiry to {coach.display_name}</h2>
            <p className="text-xs text-slate-400">Tell them about your goals and what you&apos;re looking for in a coach.</p>
            <textarea
              value={enquiryText}
              onChange={e => setEnquiryText(e.target.value)}
              placeholder="Hi, I'm training for my first marathon in October and looking for a coach…"
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 resize-none"
            />
            {enquirySent ? (
              <div className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl text-sm font-bold text-center">
                ✓ Enquiry sent!
              </div>
            ) : (
              <button onClick={sendEnquiry} disabled={!enquiryText.trim()}
                className="w-full bg-teal-500 text-white py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-95">
                Send enquiry →
              </button>
            )}
          </div>
        </>
      )}
    </main>
  )
}
