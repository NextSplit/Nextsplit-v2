'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/hooks/useProfile'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useToast } from '@/components/Toast'
import { setThemePreference } from '@/components/ThemeWrapper'
import { setUnits } from '@/lib/units'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { Profile } from '@/types/database'

interface Props {
  email: string
  initialProfile: Profile | null
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
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
        <div className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-900'}`}>{label}</div>
        {sublabel && <div className="text-[11px] text-gray-400 mt-0.5">{sublabel}</div>}
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
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-[#0D9488]' : 'bg-gray-200'}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
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
        className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
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
            : 'text-[#0D9488] bg-teal-50 border border-teal-200 hover:bg-teal-100'
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
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {!editing && (
          <button onClick={() => { setDraft(value); setEditing(true) }}
            className="text-[11px] font-semibold text-[#0D9488]" aria-label={`Edit ${label}`}>
            Edit
          </button>
        )}
      </div>
      {sublabel && <div className="text-[11px] text-gray-400 mb-1">{sublabel}</div>}
      {editing ? (
        <div className="flex gap-2 mt-1.5">
          <input
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            autoFocus
            aria-label={`${label} input`}
          />
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-2 bg-[#0D9488] text-white text-xs font-bold rounded-xl disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl">
            Cancel
          </button>
        </div>
      ) : (
        <div className="text-sm text-gray-500 mt-0.5">{value || <span className="italic text-gray-300">{placeholder ?? 'Not set'}</span>}</div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsClient({ email, initialProfile }: Props) {
  const router = useRouter()
  const { profile, updateProfile } = useProfile()
  const { plan, archivePlan } = useActivePlan()
  const { success, error: toastError, warning } = useToast()
  const { subscribe: pushSubscribe, unsubscribe: pushUnsubscribe, status: pushStatus } = usePushNotifications()

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

  async function handleSignOut() {
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
    <div className="min-h-screen bg-[#f8f8f6] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* ── Profile ── */}
        <Section title="Profile">
          <EditableRow label="Name" value={p?.display_name ?? ''} placeholder="Your name"
            sublabel="Shown on your profile and share cards" onSave={saveName} />
          <div className="border-t border-gray-50">
            <EditableRow label="Weight" type="number" value={p?.weight_kg?.toString() ?? ''}
              placeholder="kg" sublabel="Used to calculate your calorie targets" onSave={saveWeight} />
          </div>
          <div className="border-t border-gray-50">
            <EditableRow label="Age" type="number" value={p?.age?.toString() ?? ''}
              placeholder="Years" sublabel="Used for training zones and BMR" onSave={saveAge} />
          </div>
          <div className="border-t border-gray-50">
            <SettingRow label="Email" sublabel="Your login email">
              <span className="text-xs text-gray-400 max-w-[160px] truncate">{email}</span>
            </SettingRow>
          </div>
        </Section>

        {/* ── Current plan ── */}
        {plan && (
          <Section title="Current Plan">
            <SettingRow label={plan.name} sublabel={`Week ${plan.current_week} of ${plan.total_weeks}`}>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-700">Active</span>
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
                    className="flex-1 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-xl">
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
                    className="flex-1 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-xl">
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
            sublabel="Daily reminder when you have a session"
            value={p?.notifications_enabled ?? false}
            onChange={saveNotifications}
          />
          {p?.notifications_enabled && (
            <div className="px-4 py-3.5 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Reminder time</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">What time to send your daily reminder</div>
                </div>
                <input
                  type="time"
                  defaultValue={p.notification_time?.slice(0, 5) ?? '07:00'}
                  onChange={e => saveNotificationTime(e.target.value)}
                  className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  aria-label="Notification time"
                />
              </div>
            </div>
          )}
        </Section>

        {/* ── Account ── */}
        <Section title="Account">
          <ButtonRow label="Plan history" sublabel="View your completed and archived plans"
            buttonLabel="View" onClick={() => router.push('/history')} />
          <ButtonRow label="Export my data" sublabel="Download all your training logs as CSV"
            buttonLabel="Export" onClick={() => router.push('/profile')} />
          <ButtonRow label="Sign out" buttonLabel="Sign out"
            onClick={handleSignOut} disabled={signingOut} />
          <ButtonRow label="Delete account" sublabel="Permanently removes all your data"
            buttonLabel="Delete" onClick={() => toastError('To delete your account, email support@nextsplit.com')}
            danger />
        </Section>

        {/* ── Dev tools ── */}
        {(() => {
          const [seeding, setSeeding] = useState(false)
          async function seedPlans() {
            setSeeding(true)
            try {
              const res = await fetch('/api/admin/seed-plans', { method: 'POST' })
              const data = await res.json()
              if (res.ok) success(`✓ ${data.seeded} plans seeded`)
              else toastError(data.error ?? 'Seed failed')
            } catch {
              toastError('Seed failed — check connection')
            } finally {
              setSeeding(false)
            }
          }
          return (
            <Section title="Developer">
              <ButtonRow label="Re-seed plan templates" sublabel="Updates all 17 plans in Supabase with latest content"
                buttonLabel={seeding ? 'Seeding…' : 'Run'} onClick={seedPlans} disabled={seeding} />
            </Section>
          )
        })()}

        {/* Version */}
        <div className="text-center pb-4">
          <p className="text-[10px] text-gray-300">NextSplit v2 · Built with ❤️ for runners</p>
        </div>

      </div>
    </div>
  )
}
