'use client'

import { useState } from 'react'
import { Analytics } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

type FeedbackType = 'bug' | 'feature' | 'general'

const TYPES: { id: FeedbackType; emoji: string; label: string; placeholder: string }[] = [
  { id: 'bug',     emoji: '🐛', label: 'Bug report',    placeholder: 'What went wrong? What were you doing when it happened?' },
  { id: 'feature', emoji: '💡', label: 'Feature idea',  placeholder: 'What would make NextSplit better for you?' },
  { id: 'general', emoji: '💬', label: 'General',       placeholder: 'Anything on your mind — good or bad.' },
]

export function FeedbackWidget() {
  const [open, setOpen]       = useState(false)
  const [type, setType]       = useState<FeedbackType>('general')
  const [text, setText]       = useState('')
  const [rating, setRating]   = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  const placeholder = TYPES.find(t => t.id === type)?.placeholder ?? ''

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Save to feedback table
      await db(supabase).from('feedback').insert({
        user_id:      user?.id ?? null,
        feedback_type: type,
        message:      text.trim(),
        rating,
        page:         window.location.pathname,
        user_agent:   navigator.userAgent,
      }).catch(() => {}) // Non-blocking — don't fail if table doesn't exist yet

      // Track in PostHog
      Analytics.feedbackSubmitted(type, rating ?? undefined)

      setSent(true)
      setTimeout(() => {
        setSent(false)
        setOpen(false)
        setText('')
        setRating(null)
        setType('general')
      }, 2000)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center text-lg hover:bg-slate-700 transition-all active:scale-90"
        aria-label="Send feedback"
      >
        💬
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-up modal */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="px-4 pt-4 pb-8 space-y-4 max-w-lg mx-auto">

          {/* Handle */}
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

          {sent ? (
            <div className="text-center py-8 space-y-2">
              <div className="text-4xl">✅</div>
              <p className="text-base font-bold text-slate-800">Thanks for the feedback!</p>
              <p className="text-sm text-slate-400">We read every message.</p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-base font-black text-slate-900">Send feedback</h2>
                <p className="text-xs text-slate-400 mt-0.5">We read every message — good and bad.</p>
              </div>

              {/* Type selector */}
              <div className="flex gap-2">
                {TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      type === t.id
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              {/* Rating (general only) */}
              {type === 'general' && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">How are we doing?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        className={`flex-1 py-2 rounded-xl text-sm border transition-all ${
                          rating === n
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {['😤','😕','😐','🙂','😍'][n - 1]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none"
              />

              {/* Page context shown to user for transparency */}
              <p className="text-xs text-slate-300">
                Sending from: {typeof window !== 'undefined' ? window.location.pathname : ''}
              </p>

              <button
                onClick={handleSubmit}
                disabled={!text.trim() || sending}
                className="w-full bg-teal-500 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
              >
                {sending ? 'Sending…' : 'Send feedback →'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
