'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { db } from '@/lib/supabase/db'
import { useToast } from '@/components/Toast'
import { config } from '@/lib/config'

function StravaSection({ isConnected, clientId }: { clientId: string | null; isConnected: boolean }) {
  const STRAVA_CLIENT_ID = clientId ?? config.stravaClientId
  const redirectUri = typeof window !== 'undefined' ? window.location.origin + '/auth/strava/callback' : ''
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState<string | null>(null)

  // Keep localStorage flag in sync so StravaSyncButton knows connection state
  useEffect(() => {
    try {
      localStorage.setItem('nextsplit_strava_connected', isConnected ? 'true' : 'false')
      if (isConnected) {
        setLastSync(localStorage.getItem('nextsplit_strava_last_sync'))
        setAthleteName(localStorage.getItem('nextsplit_strava_athlete'))
      }
    } catch {}
  }, [isConnected])

  function connectStrava() {
    if (!STRAVA_CLIENT_ID) return
    const url = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all`
    window.location.href = url
  }

  async function disconnectStrava() {
    setDisconnecting(true)
    try {
      await fetch('/api/strava/disconnect', { method: 'POST' })
      try { localStorage.removeItem('nextsplit_strava_connected') } catch {}
      try { localStorage.removeItem('nextsplit_strava_last_sync') } catch {}
      try { localStorage.removeItem('nextsplit_strava_athlete') } catch {}
      window.location.reload()
    } finally {
      setDisconnecting(false)
    }
  }

  async function manualSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/strava/sync')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      const count = data.activities?.length ?? 0
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      try { localStorage.setItem('nextsplit_strava_last_sync', now) } catch {}
      setLastSync(now)
      setSyncMsg(`✓ Found ${count} recent activit${count === 1 ? 'y' : 'ies'}`)
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Strava</p>
            {isConnected && athleteName && (
              <p className="text-[10px] text-[var(--color-text-tertiary)]">{athleteName}</p>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]'}`}>
          {isConnected ? '✓ Connected' : 'Not connected'}
        </span>
      </div>

      {isConnected ? (
        <>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-3 ml-8">
            Tap Strava on any session in Today to import activities
            {lastSync && <span className="ml-1">· Last sync {lastSync}</span>}
          </p>
          {syncMsg && (
            <p className={`text-xs font-medium mb-2 text-center ${syncMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
              {syncMsg}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={manualSync} disabled={syncing}
              className="flex-1 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold disabled:opacity-50">
              {syncing ? 'Syncing…' : '↻ Check for activities'}
            </button>
            <button onClick={disconnectStrava} disabled={disconnecting}
              className="py-2 px-3 rounded-xl border border-[var(--color-border-2)] text-[var(--color-text-tertiary)] text-xs font-semibold disabled:opacity-50">
              {disconnecting ? '…' : 'Disconnect'}
            </button>
          </div>
        </>
      ) : STRAVA_CLIENT_ID ? (
        <>
          <p className="text-xs text-[var(--color-text-tertiary)] mb-3 ml-8">Connect to import activities with one tap from the Today tab</p>
          <button onClick={connectStrava}
            className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect Strava
          </button>
        </>
      ) : (
        <p className="text-xs text-[var(--color-text-tertiary)] text-center py-1 ml-8">Strava integration not configured</p>
      )}
    </div>
  )
}


export default StravaSection
