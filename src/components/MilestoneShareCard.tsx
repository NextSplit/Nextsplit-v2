'use client'

import { useEffect, useMemo, useState } from 'react'
import * as Sentry from '@/lib/sentry'
import { shouldUseLongPressFallback, detectInAppBrowser } from '@/lib/in-app-browser'
import { Analytics } from '@/lib/analytics'

// BL-D1/D2/D3/D4 unified consumer for the server-side card pipeline.
//
// Renders a preview that points at /api/share-card/<variant>?... — the
// edge runtime returns a 1080×1080 PNG. Compared to the legacy client
// canvas:
//   · Pixels are deterministic across browsers (canvas font rendering
//     diverges; ImageResponse uses Satori with a fixed font stack).
//   · Mobile devices stop redrawing on every share tap — the URL is
//     cacheable + fetchable.
//   · Open-graph reuse becomes free — drop the same URL into a Twitter
//     card / IG story.
//
// In-app browser fallback (BL-D3): if the device is inside Instagram,
// Snapchat, Gmail, etc., navigator.share is unreliable. We swap the CTA
// from "Share" to a long-press hint + an "Open in browser" link.
//
// Alt-text (BL-D4): the alt prop describes the milestone in plain text so
// screen-reader users get the same information conveyed by the visual.
// Stats are interpolated into the alt string by the caller.

export type ShareVariant = 'weekly' | 'session' | 'milestone' | 'race-result'
export type AccentKey    = 'cyan' | 'ember' | 'lime' | 'amber' | 'violet' | 'cobalt' | 'magenta' | 'forest'

interface Props {
  variant:      ShareVariant
  headline:     string
  sub?:         string
  alt:          string             // BL-D4 — accessibility-first alt text
  accent?:      AccentKey
  squadName?:   string
  classEmoji?:  string
  km?:          number
  sessionsDone?:    number
  sessionsPlanned?: number
  streak?:      number
  xp?:          number
  weekN?:       number
  totalWeeks?:  number
  onClose:      () => void
  shareText?:   string             // text used by navigator.share + clipboard
}

function buildCardUrl(props: Props): string {
  const sp = new URLSearchParams()
  sp.set('headline', props.headline)
  if (props.sub)             sp.set('sub', props.sub)
  if (props.accent)          sp.set('accent', props.accent)
  if (props.squadName)       sp.set('squad', props.squadName)
  if (props.classEmoji)      sp.set('class_emoji', props.classEmoji)
  if (props.km !== undefined)              sp.set('km', String(props.km))
  if (props.sessionsDone !== undefined)    sp.set('sessions_done', String(props.sessionsDone))
  if (props.sessionsPlanned !== undefined) sp.set('sessions_planned', String(props.sessionsPlanned))
  if (props.streak !== undefined)          sp.set('streak', String(props.streak))
  if (props.xp !== undefined)              sp.set('xp', String(props.xp))
  if (props.weekN !== undefined)           sp.set('week_n', String(props.weekN))
  if (props.totalWeeks !== undefined)      sp.set('total_weeks', String(props.totalWeeks))
  return `/api/share-card/${props.variant}?${sp.toString()}`
}

export default function MilestoneShareCard(props: Props) {
  const cardUrl = useMemo(() => buildCardUrl(props), [props])
  const [sharing, setSharing]               = useState(false)
  const [longPressMode, setLongPressMode]   = useState(false)
  const [inAppName, setInAppName]           = useState<string | null>(null)
  const [absoluteUrl, setAbsoluteUrl]       = useState(cardUrl)

  useEffect(() => {
    setLongPressMode(shouldUseLongPressFallback())
    setInAppName(detectInAppBrowser().app)
    if (typeof window !== 'undefined') {
      setAbsoluteUrl(`${window.location.origin}${cardUrl}`)
    }
  }, [cardUrl])

  Analytics.shareCardGenerated({ session_type: props.variant, km: props.km })

  async function handleShare() {
    setSharing(true)
    try {
      const res  = await fetch(cardUrl)
      const blob = await res.blob()
      const file = new File([blob], `nextsplit-${props.variant}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'NextSplit',
          text:  props.shareText ?? props.headline,
          files: [file],
        })
        Analytics.shareCardShared({ session_type: props.variant, method: 'native' })
      } else {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = `nextsplit-${props.variant}.png`; a.click()
        URL.revokeObjectURL(url)
        Analytics.shareCardShared({ session_type: props.variant, method: 'download' })
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        Sentry.captureException(e, { context: 'MilestoneShareCard.handleShare' })
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Share milestone card"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[var(--color-surface-3)] rounded-full mx-auto mb-4" />

        {/* Server-rendered preview. Aspect-square keeps the layout stable
            while the PNG loads. img alt mirrors the BL-D4 caller-supplied
            alt prop so screen readers convey the same milestone. */}
        <div className="rounded-2xl overflow-hidden mb-4 aspect-square">
          <img
            src={cardUrl}
            alt={props.alt}
            width={1080}
            height={1080}
            className="w-full h-full object-cover"
            draggable={longPressMode}
          />
        </div>

        {/* In-app browser hint — Instagram/Snapchat/Gmail/TikTok devices land
            here. Long-press to save is the most reliable path inside those
            webviews; the "Open in browser" button escapes via target=_blank
            so iOS hands it back to Safari (which has working navigator.share). */}
        {longPressMode && (
          <div
            role="status"
            className="text-xs mb-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,184,0,0.12)', color: '#ffb800' }}
          >
            <p className="font-bold">
              {inAppName === 'instagram' ? 'Instagram in-app browser detected.' :
               inAppName === 'fbav'      ? 'Facebook in-app browser detected.' :
               inAppName === 'snapchat'  ? 'Snapchat in-app browser detected.' :
               inAppName === 'gmail'     ? 'Gmail in-app browser detected.' :
                                            'In-app browser detected.'}
            </p>
            <p className="mt-1">Tap and hold the image to save it, or open in your default browser to share natively.</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 py-3.5 bg-[var(--ns-ember)] text-white font-bold text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sharing ? 'Preparing…' : (longPressMode ? 'Download image' : 'Share')}
          </button>
          {longPressMode && (
            <a
              href={absoluteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-4 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] font-bold text-sm rounded-2xl flex items-center justify-center"
            >
              Open
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
