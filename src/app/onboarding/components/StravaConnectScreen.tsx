'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'
import { config } from '@/lib/config'

interface StravaActivity {
  distance:       number
  moving_time:    number
  start_date:     string
  type:           string
  sport_type:     string
  average_speed?: number
}

interface StravaPrefill {
  weeklyKmCurrent:  number
  longestRecentRun: number
  trainingDays:     number
  preferredRunTime: 'morning' | 'lunchtime' | 'evening' | 'varies'
  runSurfaces:      string[]
  recentRaceTimes:  Record<string, number>
}

function analyseActivities(activities: StravaActivity[]): StravaPrefill {
  const runs = activities.filter(a =>
    a.type === 'Run' || a.sport_type === 'Run'
  )

  // Weekly km — last 8 weeks average
  const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 3600 * 1000
  const recentRuns    = runs.filter(r => new Date(r.start_date).getTime() > eightWeeksAgo)
  const totalKm       = recentRuns.reduce((s, r) => s + r.distance / 1000, 0)
  const weeklyKm      = Math.round(totalKm / 8)

  // Longest recent run (last 12 weeks)
  const twelveWeeksAgo  = Date.now() - 12 * 7 * 24 * 3600 * 1000
  const recentForLong   = runs.filter(r => new Date(r.start_date).getTime() > twelveWeeksAgo)
  const longestRecentRun = Math.round(
    Math.max(0, ...recentForLong.map(r => r.distance / 1000))
  )

  // Training days — which days of the week they typically run
  const dayCounts: Record<number, number> = {}
  recentRuns.forEach(r => {
    const day = new Date(r.start_date).getDay()
    dayCounts[day] = (dayCounts[day] ?? 0) + 1
  })
  const activeDays = Object.keys(dayCounts).filter(d => (dayCounts[Number(d)] ?? 0) >= 2).length
  const trainingDays = Math.max(2, Math.min(7, activeDays || 4))

  // Preferred run time — from activity timestamps
  const hours = recentRuns.map(r => new Date(r.start_date).getHours())
  const avgHour = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 7
  const preferredRunTime: StravaPrefill['preferredRunTime'] =
    avgHour < 10 ? 'morning' :
    avgHour < 14 ? 'lunchtime' :
    'evening'

  // Surfaces — infer from sport_type
  const surfaces: string[] = ['road']
  if (runs.some(r => r.sport_type === 'TrailRun')) surfaces.push('trail')

  // Recent race times — look for activities with race-like pacing
  // Strava doesn't tag races, but very fast paced activities over race distance are proxies
  const recentRaceTimes: Record<string, number> = {}
  const fastRuns = runs
    .filter(r => r.distance > 4000)
    .sort((a, b) => (b.average_speed ?? 0) - (a.average_speed ?? 0))

  for (const run of fastRuns.slice(0, 20)) {
    const km   = run.distance / 1000
    const time = run.moving_time
    if (km >= 4.5 && km <= 5.5 && !recentRaceTimes['5k'])   recentRaceTimes['5k']       = Math.round(time * (5 / km))
    if (km >= 9.5 && km <= 10.5 && !recentRaceTimes['10k']) recentRaceTimes['10k']      = Math.round(time * (10 / km))
    if (km >= 20 && km <= 22 && !recentRaceTimes['half'])    recentRaceTimes['half']     = Math.round(time * (21.1 / km))
    if (km >= 40 && km <= 43 && !recentRaceTimes['marathon'])recentRaceTimes['marathon'] = Math.round(time * (42.2 / km))
  }

  return { weeklyKmCurrent: weeklyKm, longestRecentRun, trainingDays, preferredRunTime, runSurfaces: surfaces, recentRaceTimes }
}

export function StravaConnectScreen() {
  const { step, data, update, next } = useOnboarding()
  const searchParams = useSearchParams()
  const [status, setStatus]   = useState<'idle' | 'checking' | 'connected' | 'importing' | 'done' | 'skipped'>('checking')
  const [prefill, setPrefill] = useState<StravaPrefill | null>(null)
  const [error, setError]     = useState('')

  // On mount — check if Strava already connected or just returned from OAuth
  useEffect(() => {
    // If just returned from Strava OAuth redirect
    if (searchParams.get('strava') === 'denied') {
      setError("Strava connection was cancelled — you can fill in manually.")
      setStatus('idle')
      return
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On mount — check if Strava already connected
  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setStatus('idle'); return }

        const { data: conn } = await db(supabase)
          .from('strava_connections')
          .select('athlete_id, access_token')
          .eq('user_id', user.id)
          .maybeSingle()

        if (conn) {
          setStatus('importing')
          await importStravaData(conn.access_token)
        } else {
          setStatus('idle')
        }
      } catch {
        setStatus('idle')
      }
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const importStravaData = async (accessToken: string) => {
    try {
      setStatus('importing')
      const res = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?per_page=100&page=1',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!res.ok) throw new Error('Strava fetch failed')
      const activities: StravaActivity[] = await res.json()
      const analysed = analyseActivities(activities)
      setPrefill(analysed)
      setStatus('connected')
    } catch (err) {
      console.error('Strava import error:', err)
      setError('Couldn\'t fetch your Strava data — you can fill in manually instead.')
      setStatus('idle')
    }
  }

  const handleConnectStrava = () => {
    const clientId   = config.stravaClientId
    const redirectUri = `${window.location.origin}/auth/strava/callback?onboarding=1`
    const scope      = 'read,activity:read'
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`
  }

  const handleUsePrefill = () => {
    if (prefill) {
      update({
        weeklyKmCurrent:  prefill.weeklyKmCurrent,
        longestRecentRun: prefill.longestRecentRun,
        trainingDays:     prefill.trainingDays,
        preferredRunTime: prefill.preferredRunTime,
        runSurfaces:      prefill.runSurfaces,
        recentRaceTimes:  prefill.recentRaceTimes,
      })
    }
    next()
  }

  const handleSkip = () => {
    setStatus('skipped')
    next()
  }

  // ── Checking state ──────────────────────────────────────────────────────────
  if (status === 'checking' || status === 'importing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-4xl animate-pulse">🔄</div>
          <p className="text-sm text-slate-500">
            {status === 'checking' ? 'Checking Strava connection…' : 'Importing your training data…'}
          </p>
        </div>
      </div>
    )
  }

  // ── Connected + prefill ready ───────────────────────────────────────────────
  if (status === 'connected' && prefill) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

        <div className="flex-1 px-4 pt-4 pb-32 space-y-4">
          <div className="text-center py-2">
            <div className="text-3xl mb-2">✅</div>
            <h1 className="text-xl font-black text-slate-900">Strava connected</h1>
            <p className="text-sm text-slate-500 mt-1">Here&apos;s what we found from your recent training</p>
          </div>

          {/* Prefill summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">We&apos;ll pre-fill these for you</p>
            <div className="space-y-2">
              {[
                { label: 'Weekly mileage',    value: `~${prefill.weeklyKmCurrent} km/week` },
                { label: 'Longest recent run', value: `${prefill.longestRecentRun} km` },
                { label: 'Training days',     value: `${prefill.trainingDays}x per week` },
                { label: 'Preferred run time', value: prefill.preferredRunTime },
                { label: 'Surfaces',          value: prefill.runSurfaces.join(', ') },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-bold text-slate-800 capitalize">{item.value}</span>
                </div>
              ))}
            </div>

            {Object.keys(prefill.recentRaceTimes).length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Race times found</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(prefill.recentRaceTimes).map(([dist, secs]) => {
                    const h = Math.floor(secs / 3600)
                    const m = Math.floor((secs % 3600) / 60)
                    const s = secs % 60
                    return (
                      <div key={dist} className="bg-[var(--ns-forest-light)] rounded-xl p-2 text-center">
                        <p className="text-xs text-[var(--ns-forest)] font-bold uppercase">{dist}</p>
                        <p className="text-sm font-black text-teal-800">
                          {`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center px-4">
            You can review and adjust any of these on the next screens
          </p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 space-y-2">
          <button
            onClick={handleUsePrefill}
            className="w-full bg-[var(--ns-forest)] text-white py-3.5 rounded-2xl text-sm font-bold active:scale-95 transition-all"
          >
            Use this data → skip ahead
          </button>
          <button
            onClick={next}
            className="w-full text-slate-400 py-2 text-sm"
          >
            I&apos;ll fill it in manually instead
          </button>
        </div>
      </div>
    )
  }

  // ── Idle — prompt to connect ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 px-4 pt-6 pb-32 flex flex-col items-center justify-center gap-6 text-center">

        {/* Strava logo area */}
        <div className="w-20 h-20 rounded-3xl bg-[#FC4C02]/10 border border-[#FC4C02]/20 flex items-center justify-center">
          <span className="text-4xl">🟠</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900">Connect Strava</h1>
          <p className="text-sm text-slate-500 max-w-xs">
            Skip most of the setup — we&apos;ll pull your training history and pre-fill your profile automatically.
          </p>
        </div>

        {/* What we import */}
        <div className="w-full max-w-xs bg-white rounded-2xl border border-slate-200 p-4 text-left space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">We&apos;ll import</p>
          {[
            '📊 Current weekly mileage',
            '🏃 Longest recent run',
            '📅 Which days you train',
            '🌅 Preferred run time',
            '🏅 Recent race times (estimated)',
            '🌲 Surfaces you run on',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
              <span>{item}</span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 max-w-xs">
            {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 space-y-2">
        <button
          onClick={handleConnectStrava}
          className="w-full bg-[#FC4C02] text-white py-3.5 rounded-2xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>🟠</span> Connect Strava — skip the setup
        </button>
        <button
          onClick={handleSkip}
          className="w-full bg-slate-100 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors active:scale-95"
        >
          Skip for now →
        </button>
      </div>
    </div>
  )
}
