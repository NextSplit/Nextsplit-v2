'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useSubscription } from '@/hooks/useSubscription'
import { useToast } from '@/components/Toast'
import { setThemePreference } from '@/components/ThemeWrapper'
import { setUnits } from '@/lib/units'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'

interface Props {
  email: string
  initialProfile: Profile | null
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div>
      <div className="px-4 py-2">
        <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">{title}</span>
      </div>
      <div className="rounded-2xl overflow-hidden divide-y" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderColor: "var(--color-border)" }}>
        {children}
      </div>
    </div>
  )
}

// ─── Row types ───────────────────────────────────────────────────────────────

function SettingRow({ label, sublabel, children, danger }: {
  label: string; sublabel?: string; children?: React.ReactNode; danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-3">
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${danger ? 'text-red-500' : ''}`} style={danger ? {} : { color: 'var(--color-text-primary)' }}>{label}</div>
        {sublabel && <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{sublabel}</div>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  )
}

function ToggleRow({ label, sublabel, value, onChange }: {
  label: string; sublabel?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <SettingRow label={label} sublabel={sublabel}>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-[var(--ns-ember)]' : 'bg-gray-200'}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--color-surface)] shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </SettingRow>
  )
}

function SelectRow<T extends string>({ label, sublabel, value, options, onChange }: {
  label: string; sublabel?: string; value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <SettingRow label={label} sublabel={sublabel}>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="text-sm rounded-lg px-2.5 py-1.5 focus:outline-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
        aria-label={label}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </SettingRow>
  )
}

function ButtonRow({ label, sublabel, buttonLabel, onClick, danger, disabled }: {
  label: string; sublabel?: string; buttonLabel: string
  onClick: () => void; danger?: boolean; disabled?: boolean
}) {
  return (
    <SettingRow label={label} sublabel={sublabel} danger={danger}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-all ${
          danger
            ? 'text-red-500 bg-red-50 border border-red-200 hover:bg-red-100'
            : 'text-[var(--ns-ember)] bg-[var(--ns-forest-light)] border border-green-100 hover:bg-green-100'
        }`}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>
    </SettingRow>
  )
}

// ─── Inline edit field ────────────────────────────────────────────────────────

function EditableRow({ label, sublabel, value, placeholder, type = 'text', onSave }: {
  label: string; sublabel?: string; value: string; placeholder?: string
  type?: string; onSave: (v: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft); setEditing(false) }
    finally { setSaving(false) }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
        {!editing && (
          <button onClick={() => { setDraft(value); setEditing(true) }}
            className="text-[11px] font-semibold text-[var(--ns-ember)]" aria-label={`Edit ${label}`}>
            Edit
          </button>
        )}
      </div>
      {sublabel && <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1">{sublabel}</div>}
      {editing ? (
        <div className="flex gap-2 mt-1.5">
          <input
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            autoFocus
            aria-label={`${label} input`}
          />
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-2 bg-[var(--ns-ember)] text-white text-xs font-bold rounded-xl disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-2 text-xs font-semibold rounded-xl" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="text-sm text-[var(--color-text-secondary)] mt-0.5">{value || <span className="italic text-gray-300">{placeholder ?? 'Not set'}</span>}</div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function DeveloperSection({ onError, onSuccess }: { onError: (m: string) => void; onSuccess: (m: string) => void }) {
  const [seeding, setSeeding] = useState(false)
  async function seedPlans() {
    setSeeding(true)
    try {
      const res  = await fetch('/api/admin/seed-plans', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const results = data.results ?? []
        const ok   = results.filter((r: { status: string }) => r.status === 'ok').length
        const fail = results.filter((r: { status: string }) => r.status === 'fail').length
        if (fail > 0) onError(`${ok} seeded, ${fail} failed`)
        else onSuccess(`✓ ${ok} plans seeded`)
      } else { onError(data.error ?? 'Seed failed') }
    } catch { onError('Seed failed — check connection') }
    finally { setSeeding(false) }
  }
  return (
    <Section title="Developer">
      <ButtonRow label="Re-seed plan templates" sublabel="Updates all 17 plans in Supabase with latest content"
        buttonLabel={seeding ? 'Seeding…' : 'Run'} onClick={seedPlans} disabled={seeding} />
    </Section>
  )
}

function CoachAccessSection() {
  const [rel, setRel]         = useState<{ coach_id: string; share_logs: boolean; share_wellness: boolean; share_nutrition: boolean; share_body_weight: boolean } | null>(null)
  const [coachName, setCoachName] = useState('')
  const [saving, setSaving]   = useState(false)
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('coach_athletes').select('*').eq('athlete_id', user.id).eq('status', 'active').maybeSingle()
      if (data) {
        setRel(data)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: coach } = await (supabase as any).from('coach_profiles').select('display_name').eq('user_id', data.coach_id).single()
        setCoachName(coach?.display_name ?? 'Your coach')
      }
    }
    load()
  }, [])

  if (!rel) {
    return <p className="text-sm text-[var(--color-text-tertiary)] px-1">No active coach connected. <Link href="/coach/setup" className="text-[var(--ns-ember)] hover:underline">Become a coach</Link> or accept an invite to connect.</p>
  }

  const toggle = async (field: 'share_logs' | 'share_wellness' | 'share_nutrition' | 'share_body_weight') => {
    if (!rel) return
    setSaving(true)
    const updated = { ...rel, [field]: !rel[field] }
    setRel(updated)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('coach_athletes').update({ [field]: updated[field] }).eq('coach_id', rel.coach_id).eq('athlete_id', user.id)
    }
    setSaving(false)
  }

  const disconnect = async () => {
    if (!rel) return
    const confirmed = window.confirm(`Disconnect from ${coachName}? They will no longer see your training data.`)
    if (!confirmed) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (user) await (supabase as any).from('coach_athletes').update({ status: 'ended' }).eq('coach_id', rel.coach_id).eq('athlete_id', user.id)
    setRel(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm px-1" style={{ color: 'var(--color-text-secondary)' }}>Connected to <span className="font-semibold">{coachName}</span>. Control what they can see.</p>
      {[
        { field: 'share_logs' as const,         label: 'Training logs',    sublabel: 'Runs and gym sessions' },
        { field: 'share_wellness' as const,      label: 'Wellness scores',  sublabel: 'Sleep, energy, soreness' },
        { field: 'share_nutrition' as const,     label: 'Nutrition diary',  sublabel: 'Daily food logs' },
        { field: 'share_body_weight' as const,   label: 'Body weight',      sublabel: 'Weight from wellness logs' },
      ].map(item => (
        <SettingRow key={item.field} label={item.label} sublabel={item.sublabel}>
          <button
            onClick={() => toggle(item.field)}
            disabled={saving}
            className={`w-11 h-6 rounded-full transition-all relative ${rel[item.field] ? 'bg-[var(--ns-ember)]' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-[var(--color-surface)] rounded-full shadow transition-all ${rel[item.field] ? 'left-5' : 'left-0.5'}`} />
          </button>
        </SettingRow>
      ))}
      <button onClick={disconnect} className="text-xs text-red-500 hover:text-red-700 px-1 pt-1">
        Disconnect from {coachName}
      </button>
    </div>
  )
}

// ─── Split Leader Upgrade Section ────────────────────────────────────────────

function SplitLeaderSection({ coachTier, isPro }: { coachTier: string | null; isPro: boolean }) {
  const [activating, setActivating] = useState(false)
  const [done, setDone] = useState(coachTier === 'split_leader' || coachTier === 'professional')
  const { error: toastError, success: toastSuccess } = useToast()

  async function activate() {
    if (!isPro) return
    setActivating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ is_coach: true, coach_tier: 'split_leader' })
        .eq('id', user.id)
      if (error) throw error
      setDone(true)
      toastSuccess('Split Leader activated! Head to the Athletes tab to manage your squad.')
    } catch {
      toastError('Something went wrong — try again')
    } finally {
      setActivating(false)
    }
  }

  // Already a pro coach — don't show split leader section
  if (coachTier === 'professional') return null

  if (done) {
    return (
      <div className="flex items-center gap-3 px-1">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm">✓</span>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Split Leader active</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Manage your squad from the Athletes tab</p>
        </div>
        <Link href="/coach/squad" className="ml-auto text-xs font-bold text-[var(--ns-ember)] flex-shrink-0">
          Squad →
        </Link>
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="bg-[var(--ns-forest-light)] rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <p className="text-sm font-bold text-[var(--ns-ember)]">Split Leader</p>
          <span className="text-[10px] bg-[var(--ns-ember)] text-white px-2 py-0.5 rounded-full font-bold ml-auto">Pro</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Coach up to 5 runners. Share your plan, annotate sessions, run a squad leaderboard. Included free with NextSplit Pro.
        </p>
        <a href="/profile" className="inline-block mt-1 text-xs font-bold text-[var(--ns-ember)] underline">
          Upgrade to Pro to unlock →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-[var(--ns-forest-light)] rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-sm font-bold text-[var(--ns-ember)]">Become a Split Leader</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Included with your Pro subscription — no extra cost.</p>
          </div>
        </div>
        <ul className="space-y-1.5 mb-4">
          {[
            'Squad view — see all your runners in one place',
            'Annotate sessions — leave coaching notes on any run',
            'Squad leaderboard — friendly competition drives consistency',
            'Share your training plan — runners follow it free',
            'Up to 5 runners (upgrade to Pro Coach for more)',
          ].map(f => (
            <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="text-[var(--ns-ember)] font-bold mt-0.5">→</span>
              {f}
            </li>
          ))}
        </ul>
        <button
          onClick={activate}
          disabled={activating}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-95"
          style={{ background: 'var(--ns-ember)' }}
        >
          {activating ? 'Activating…' : 'Activate Split Leader →'}
        </button>
      </div>
    </div>
  )
}

// ─── Pro Coach Apply Section ──────────────────────────────────────────────────

function ProCoachSection({ coachTier, isPro }: { coachTier: string | null; isPro: boolean }) {
  const router = useRouter()
  const isApplied = coachTier === 'professional'
  const isLeader  = coachTier === 'split_leader'

  if (isApplied) {
    return (
      <div className="flex items-center gap-3 px-1">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm">🏆</span>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Professional Coach</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Full coach platform unlocked</p>
        </div>
        <Link href="/coach/squad" className="ml-auto text-xs font-bold text-[var(--ns-ember)] flex-shrink-0">
          Dashboard →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <p className="text-sm font-bold text-amber-800">Professional Coach</p>
        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold ml-auto">£29/mo</span>
      </div>
      <p className="text-xs text-amber-700 leading-relaxed">
        Unlimited athletes, voice messages, plan builder, marketplace listing, AI automation, verified badge. 48hr review for credentialed coaches.
      </p>
      {!isPro && (
        <p className="text-[11px] text-amber-600 font-medium">Requires Pro subscription first.</p>
      )}
      <button
        onClick={() => router.push('/coach/setup')}
        disabled={!isPro && !isLeader}
        className="w-full py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 disabled:opacity-40 active:scale-95 transition-all"
      >
        {isLeader ? 'Apply to become a Pro Coach →' : 'Learn more about Pro Coach →'}
      </button>
    </div>
  )
}

export default function SettingsClient({ email, initialProfile }: Props) {
  const router = useRouter()
  const { profile, updateProfile } = useProfile()
  const { plan, archivePlan } = useActivePlan()
  const { success, error: toastError, warning } = useToast()
  const { subscribe: pushSubscribe, unsubscribe: pushUnsubscribe, status: pushStatus } = usePushNotifications()
  const { isPro } = useSubscription()
  const { consent: cookieConsent, accept: acceptCookies, decline: declineCookies } = useCookieConsent()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coachTier = (profile as any)?.coach_tier ?? null

  // Use live profile if loaded, fall back to server-rendered initial
  const p = profile ?? initialProfile

  // Sync Supabase preferences → localStorage on first profile load (new device / fresh install)
  useEffect(() => {
    if (!profile) return
    setThemePreference('dark_mode', profile.dark_mode)
    setThemePreference('text_size', profile.text_size)
    if (profile.units) {
      try { localStorage.setItem('nextsplit_units', profile.units) } catch {}
    }
  }, [profile])

  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // ─── Profile saves ───────────────────────────────────────────────────────────

  async function saveName(val: string) {
    try {
      await updateProfile({ display_name: val.trim() || null })
      success('Name updated')
    } catch { toastError('Failed to save name') }
  }

  async function saveWeight(val: string) {
    const num = parseFloat(val)
    if (val && (isNaN(num) || num < 20 || num > 300)) {
      toastError('Enter a weight between 20–300 kg'); return
    }
    try {
      await updateProfile({ weight_kg: val ? num : null })
      success('Weight updated')
    } catch { toastError('Failed to save weight') }
  }

  async function saveAge(val: string) {
    const num = parseInt(val)
    if (val && (isNaN(num) || num < 10 || num > 100)) {
      toastError('Enter an age between 10–100'); return
    }
    try {
      await updateProfile({ age: val ? num : null })
      success('Age updated')
    } catch { toastError('Failed to save age') }
  }

  // ─── Preference saves ────────────────────────────────────────────────────────

  async function saveUnits(val: 'km' | 'miles') {
    try {
      await updateProfile({ units: val })
      setUnits(val)
      success(`Switched to ${val}`)
    } catch { toastError('Failed to update units') }
  }

  async function saveDarkMode(val: boolean) {
    try {
      await updateProfile({ dark_mode: val })
      setThemePreference('dark_mode', val)
      success(val ? 'Dark mode on' : 'Dark mode off')
    } catch { toastError('Failed to update appearance') }
  }

  async function saveTextSize(val: 'default' | 'large' | 'xl') {
    try {
      await updateProfile({ text_size: val })
      setThemePreference('text_size', val)
      success('Text size updated')
    } catch { toastError('Failed to update text size') }
  }

  async function saveNotifications(val: boolean) {
    try {
      if (val) {
        const ok = await pushSubscribe()
        if (!ok) {
          if (pushStatus === 'denied') {
            toastError('Please allow notifications in your browser settings')
          } else {
            toastError('Could not enable notifications')
          }
          return
        }
      } else {
        await pushUnsubscribe()
      }
      await updateProfile({ notifications_enabled: val })
      success(val ? 'Notifications enabled' : 'Notifications disabled')
    } catch { toastError('Failed to update notifications') }
  }

  async function saveNotificationTime(val: string) {
    try {
      await updateProfile({ notification_time: val + ':00' })
      success('Reminder time saved')
    } catch { toastError('Failed to save reminder time') }
  }

  // ─── Plan actions ────────────────────────────────────────────────────────────

  async function handleArchivePlan() {
    setArchiving(true)
    try {
      await archivePlan()
      success('Plan archived — choose a new plan to get started')
      router.push('/onboarding')
    } catch {
      toastError('Failed to archive plan')
    } finally {
      setArchiving(false)
      setConfirmArchive(false)
    }
  }

  async function handleResetPlan() {
    if (!plan) return
    setResetting(true)
    try {
      const res = await fetch('/api/plans/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      })
      if (!res.ok) throw new Error('Reset failed')
      success('Plan reset to Week 1')
      router.push('/plan')
      router.refresh()
    } catch {
      toastError('Failed to reset plan')
    } finally {
      setResetting(false)
      setConfirmReset(false)
    }
  }

  async function handleDataExport() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('export_user_data', { p_user_id: user.id })
      if (error) throw error
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `nextsplit-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      success('Data exported successfully')
    } catch {
      toastError('Export failed — please try again')
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Are you sure? This permanently deletes all your data and cannot be undone.'
    )
    if (!confirmed) return
    const doubleConfirm = window.confirm('Final confirmation — delete everything?')
    if (!doubleConfirm) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('delete_user_account', { p_user_id: user.id })
      router.push('/')
    } catch {
      toastError('Deletion failed — contact support@nextsplit.com')
    }
  }

  async function handleSignOut() {
    try { posthog.reset() } catch { /* not loaded */ }
    setSigningOut(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch {
      toastError('Sign out failed')
      setSigningOut(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>

      {/* Header */}
      <div className="border-b px-4 pt-12 pb-4 sticky top-0 z-40" style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-display text-xl italic" style={{ color: 'var(--color-text-primary)' }}>Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* ── Profile ── */}
        <Section title="Profile">
          <EditableRow label="Name" value={p?.display_name ?? ''} placeholder="Your name"
            sublabel="Shown on your profile and share cards" onSave={saveName} />
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <EditableRow label="Weight" type="number" value={p?.weight_kg?.toString() ?? ''}
              placeholder="kg" sublabel="Used to calculate your calorie targets" onSave={saveWeight} />
          </div>
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <EditableRow label="Age" type="number" value={p?.age?.toString() ?? ''}
              placeholder="Years" sublabel="Used for training zones and BMR" onSave={saveAge} />
          </div>
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <SettingRow label="Email" sublabel="Your login email">
              <span className="text-xs text-[var(--color-text-tertiary)] max-w-[160px] truncate">{email}</span>
            </SettingRow>
          </div>
        </Section>

        {/* ── Current plan ── */}
        {plan && (
          <Section title="Current Plan">
            <SettingRow label={plan.name} sublabel={`Week ${plan.current_week} of ${plan.total_weeks}`}>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[var(--ns-forest-light)] text-[var(--ns-ember)]">Active</span>
            </SettingRow>

            {/* Reset */}
            {!confirmReset ? (
              <ButtonRow label="Reset to Week 1" sublabel="Keeps your history, restarts progress"
                buttonLabel="Reset" onClick={() => setConfirmReset(true)} />
            ) : (
              <div className="px-4 py-3 bg-amber-50">
                <p className="text-xs text-amber-800 font-medium mb-2">Reset to Week 1? Your logged sessions will be kept in history.</p>
                <div className="flex gap-2">
                  <button onClick={handleResetPlan} disabled={resetting}
                    className="flex-1 py-2 text-xs font-bold bg-amber-500 text-white rounded-xl disabled:opacity-50">
                    {resetting ? 'Resetting…' : 'Yes, reset'}
                  </button>
                  <button onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Archive / switch plan */}
            {!confirmArchive ? (
              <ButtonRow label="Switch plan" sublabel="Archives this plan and starts fresh"
                buttonLabel="Switch" onClick={() => setConfirmArchive(true)} danger />
            ) : (
              <div className="px-4 py-3 bg-red-50">
                <p className="text-xs text-red-800 font-medium mb-2">Archive this plan? You can still view it in Plan History. Your XP and badges carry over.</p>
                <div className="flex gap-2">
                  <button onClick={handleArchivePlan} disabled={archiving}
                    className="flex-1 py-2 text-xs font-bold bg-red-500 text-white rounded-xl disabled:opacity-50">
                    {archiving ? 'Archiving…' : 'Yes, archive'}
                  </button>
                  <button onClick={() => setConfirmArchive(false)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}

        {!plan && (
          <Section title="Plan">
            <ButtonRow label="No active plan" sublabel="Choose a plan to get started"
              buttonLabel="Browse plans" onClick={() => router.push('/onboarding')} />
          </Section>
        )}

        {/* ── Units ── */}
        <Section title="Units">
          <SelectRow
            label="Distance & pace"
            sublabel="Changes all distances and pace displays"
            value={(p?.units ?? 'km') as 'km' | 'miles'}
            options={[
              { value: 'km', label: 'Kilometres (km)' },
              { value: 'miles', label: 'Miles (mi)' },
            ]}
            onChange={saveUnits}
          />
        </Section>

        {/* ── Appearance ── */}
        <Section title="Appearance">
          <ToggleRow
            label="Dark mode"
            sublabel="Easier on the eyes at night"
            value={p?.dark_mode ?? false}
            onChange={saveDarkMode}
          />
          <SelectRow
            label="Text size"
            value={(p?.text_size ?? 'default') as 'default' | 'large' | 'xl'}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'large', label: 'Large' },
              { value: 'xl', label: 'Extra large' },
            ]}
            onChange={saveTextSize}
          />
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications">
          <ToggleRow
            label="Training reminders"
            sublabel="Enable push notifications from NextSplit"
            value={p?.notifications_enabled ?? false}
            onChange={saveNotifications}
          />
          {p?.notifications_enabled && (
            <>
              <div className="px-4 py-3.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">Reminder time</div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">Your typical session time</div>
                  </div>
                  <input
                    type="time"
                    defaultValue={p.notification_time?.slice(0, 5) ?? '07:00'}
                    onChange={e => saveNotificationTime(e.target.value)}
                    className="text-sm rounded-lg px-2.5 py-1.5 focus:outline-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
                    aria-label="Notification time"
                  />
                </div>
              </div>
              {/* Per-type notification preferences */}
              <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="px-4 py-2.5">
                  <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                    Notification types
                  </p>
                </div>
                {([
                  { key: 'session_reminder',     label: 'Session reminders',   sub: 'Before your scheduled sessions' },
                  { key: 'adaptation_alert',     label: 'Plan updates',         sub: 'When your plan is adapted' },
                  { key: 'weekly_recap',         label: 'Weekly recap',         sub: 'Sunday evening summary' },
                  { key: 'race_countdown',       label: 'Race countdown',       sub: 'Final 4 weeks before race day' },
                  { key: 'streak_at_risk',       label: 'Streak reminder',      sub: 'When your streak is at risk' },
                  { key: 'coach_message',        label: 'Coach messages',       sub: 'Voice notes and messages' },
                  { key: 'at_risk_reengagement', label: 'Check-in reminder',   sub: 'If you haven\'t logged in 4 days' },
                  { key: 'class_revealed',       label: 'Class reveal',         sub: 'When your runner class is ready' },
                ] as const).map(item => {
                  const prefKey = `notif_${item.key}`
                  const isOn = p?.[prefKey as keyof typeof p] !== false  // default true
                  return (
                    <ToggleRow
                      key={item.key}
                      label={item.label}
                      sublabel={item.sub}
                      value={isOn}
                      onChange={async (val) => {
                        try {
                          await updateProfile({ [prefKey]: val } as never)
                        } catch { toastError('Failed to update') }
                      }}
                    />
                  )
                })}
                <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] leading-relaxed">
                    Quiet hours (10pm–7am) are always respected regardless of these settings.
                    Maximum one notification per day.
                  </p>
                </div>
              </div>
            </>
          )}
        </Section>

        {/* ── Squad & Coaching ── */}
        <Section title="Squad & Coaching">
          <SplitLeaderSection coachTier={coachTier} isPro={isPro} />
          <ProCoachSection coachTier={coachTier} isPro={isPro} />
        </Section>

        {/* ── Coach Access ── */}
        <Section title="Coach Access" id="coach-access">
          <CoachAccessSection />
        </Section>

        {/* ── Account ── */}
        <Section title="Account">
          {/* Analytics consent — manageable after initial choice */}
          <ToggleRow
            label="Analytics"
            sublabel="Help us improve NextSplit by sharing anonymous usage data. No advertising, no third-party sharing."
            value={cookieConsent === 'accepted'}
            onChange={val => val ? acceptCookies() : declineCookies()}
          />
          <ButtonRow label="Plan history" sublabel="View your completed and archived plans"
            buttonLabel="View" onClick={() => router.push('/history')} />
          <ButtonRow label="Export my data" sublabel="Download a copy of all your data (GDPR)"
            buttonLabel="Export" onClick={handleDataExport} />
          <ButtonRow label="Sign out" buttonLabel="Sign out"
            onClick={handleSignOut} disabled={signingOut} />
          <ButtonRow label="Delete account" sublabel="Permanently removes all your data — cannot be undone"
            buttonLabel="Delete" onClick={handleDeleteAccount}
            danger />
        </Section>

        {/* ── Dev tools ── */}
        <DeveloperSection onError={toastError} onSuccess={success} />

        {/* Version */}
        <div className="text-center pb-4">
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>NextSplit v2 · Built with ❤️ for runners</p>
        </div>

      </div>
    </div>
  )
}
