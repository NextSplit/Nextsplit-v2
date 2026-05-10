'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CoachMessageThread } from '@/components/coach/CoachMessageThread'

interface Props {
  coachId:        string
  athleteId:      string
  coachName:      string
  coachSlug:      string | null
  coachPhotoUrl:  string | null
}

// /coach/messages athlete view — full-page wrapper around the existing
// CoachMessageThread modal. Renders a header with the coach's identity
// (avatar + name + tap-to-profile) above the thread itself. onClose
// from the underlying thread component routes back to /home.

export default function MessagesClient({
  coachId, athleteId, coachName, coachSlug, coachPhotoUrl,
}: Props) {
  const router = useRouter()

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-lg mx-auto">

        {/* Header — coach identity + back affordance */}
        <div
          className="sticky top-0 z-30 px-4 pt-12 pb-3 border-b"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
          }}
        >
          <button
            onClick={() => router.back()}
            className="text-xs font-bold mb-1.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            {coachPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coachPhotoUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
              >
                {coachName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
                Your coach
              </p>
              <p className="text-base font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
                {coachName}
              </p>
            </div>
            {coachSlug && (
              <Link
                href={`/coach/${coachSlug}`}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
              >
                Profile
              </Link>
            )}
          </div>
        </div>

        {/* Thread — CoachMessageThread is built as a modal but we host
            it as the page body so the athlete has a dedicated comms
            surface (P3.3 Train-tab/inbox spec). onClose returns to
            wherever the user came from (typically /home → HeroCoach). */}
        <div className="px-4 pt-4">
          <CoachMessageThread
            coachId={coachId}
            athleteId={athleteId}
            coachName={coachName}
            isCoach={false}
            embedded
            onClose={() => router.push('/home')}
          />
        </div>
      </div>
    </div>
  )
}
