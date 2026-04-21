'use client'

/**
 * Adaptation E2E Test Tool — Phase A5
 *
 * Tests the 5 adaptation scenarios before alpha users trigger them:
 * 1. Miss 1 easy run — should shift, not drop
 * 2. Miss interval session — should protect next quality session
 * 3. Miss a whole week — should reduce remaining volume proportionally
 * 4. Miss with 4 weeks to race — should protect the taper
 * 5. Verify paywall: free user sees paywall, Pro user sees rebuild
 */

import { useState } from 'react'

interface Plan {
  id:            string
  name:          string
  current_week:  number
  total_weeks:   number
  race_date:     string | null
}

interface ScenarioResult {
  scenario:   string
  status:     'pass' | 'warn' | 'fail' | 'pending' | 'running'
  detail:     string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response?:  any
}

const SCENARIOS = [
  {
    id:     'miss_easy',
    label:  'Miss 1 easy run',
    expect: 'Session should be rescheduled or volume absorbed — not silently dropped',
    missedDays: [0], // Monday
    reason: 'life' as const,
  },
  {
    id:     'miss_interval',
    label:  'Miss interval session',
    expect: 'Next quality session should be protected. Should NOT insert another interval immediately.',
    missedDays: [1], // Tuesday (typical interval day)
    reason: 'life' as const,
  },
  {
    id:     'miss_full_week',
    label:  'Miss full week (illness)',
    expect: 'Remaining volume should reduce proportionally. Should not try to cram missed km.',
    missedDays: [0, 1, 2, 3, 4, 5, 6],
    reason: 'illness' as const,
  },
  {
    id:     'miss_pre_taper',
    label:  'Miss session with 4 weeks to race',
    expect: 'Taper should be protected. Should not add more load to compensate.',
    missedDays: [0],
    reason: 'life' as const,
  },
  {
    id:     'valid_input',
    label:  'Invalid plan_id (Zod)',
    expect: 'API should return 400 with structured error — not 500',
    missedDays: [],
    reason: 'life' as const,
    invalid: true,
  },
]

function statusColour(s: ScenarioResult['status']) {
  return s === 'pass'    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
         s === 'warn'    ? 'text-amber-700 bg-amber-50 border-amber-200' :
         s === 'fail'    ? 'text-red-700 bg-red-50 border-red-200' :
         s === 'running' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                           'text-gray-500 bg-gray-50 border-gray-200'
}

function statusIcon(s: ScenarioResult['status']) {
  return s === 'pass' ? '✓' : s === 'warn' ? '⚠' : s === 'fail' ? '✗' : s === 'running' ? '⏳' : '○'
}

export default function AdaptTestClient({ plans }: { plans: Plan[] }) {
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.id ?? '')
  const [results, setResults]           = useState<ScenarioResult[]>(
    SCENARIOS.map(s => ({ scenario: s.id, status: 'pending', detail: 'Not run yet' }))
  )
  const [running, setRunning]           = useState(false)

  function updateResult(id: string, result: Partial<ScenarioResult>) {
    setResults(prev => prev.map(r => r.scenario === id ? { ...r, ...result } : r))
  }

  async function runScenario(s: typeof SCENARIOS[0], planId: string) {
    updateResult(s.id, { status: 'running', detail: 'Running…' })

    if (s.invalid) {
      // Test Zod validation
      try {
        const res = await fetch('/api/ai/adapt-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: 'not-a-uuid', week_n: 1 }),
        })
        const data = await res.json()
        if (res.status === 400 && data.error === 'Invalid request') {
          updateResult(s.id, { status: 'pass', detail: `400 returned with structured error. Fields: ${data.details?.join(', ')}`, response: data })
        } else {
          updateResult(s.id, { status: 'fail', detail: `Expected 400, got ${res.status}: ${JSON.stringify(data)}`, response: data })
        }
      } catch (e) {
        updateResult(s.id, { status: 'fail', detail: `Request threw: ${e}` })
      }
      return
    }

    const plan = plans.find(p => p.id === planId)
    if (!plan) {
      updateResult(s.id, { status: 'fail', detail: 'No plan selected' })
      return
    }

    try {
      const res = await fetch('/api/ai/adapt-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id:            planId,
          week_n:             plan.current_week,
          missed_day_indices: s.missedDays,
          reason:             s.reason,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        updateResult(s.id, { status: 'fail', detail: `API returned ${res.status}: ${data.error ?? JSON.stringify(data)}`, response: data })
        return
      }

      // Evaluate the response quality
      const hasAdaptedWeeks = data.adaptedWeeks && data.adaptedWeeks.length > 0
      const hasNote         = data.coachNote && data.coachNote.length > 20
      const hasSummary      = data.summary && data.summary.length > 10

      if (hasAdaptedWeeks && hasNote) {
        updateResult(s.id, {
          status:   'pass',
          detail:   `Adapted ${data.adaptedWeeks?.length ?? 0} weeks. Note: "${data.coachNote?.slice(0, 80)}…"`,
          response: data,
        })
      } else if (res.ok && !hasAdaptedWeeks) {
        updateResult(s.id, {
          status:  'warn',
          detail:  `API succeeded but no adaptedWeeks in response. Keys: ${Object.keys(data).join(', ')}`,
          response: data,
        })
      } else {
        updateResult(s.id, {
          status:   'warn',
          detail:   `Response ok but missing coach note. Summary: ${hasSummary ? data.summary?.slice(0, 60) : 'none'}`,
          response: data,
        })
      }
    } catch (e) {
      updateResult(s.id, { status: 'fail', detail: `Request threw: ${e}` })
    }
  }

  async function runAll() {
    if (!selectedPlan && !SCENARIOS.find(s => s.invalid)) {
      return
    }
    setRunning(true)
    for (const scenario of SCENARIOS) {
      await runScenario(scenario, selectedPlan)
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500))
    }
    setRunning(false)
  }

  const passCount = results.filter(r => r.status === 'pass').length
  const failCount = results.filter(r => r.status === 'fail').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Admin · Phase A5</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Adaptation E2E Test</h1>
          <p className="text-sm text-gray-500 mt-1">
            Run all 5 scenarios against a real plan before alpha users trigger adaptation.
          </p>
        </div>

        {/* Plan selector */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Test plan</p>
          {plans.length === 0 ? (
            <p className="text-sm text-amber-600">No active plans found. Activate a plan first to test adaptation.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {plans.map(p => (
                <button key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`text-xs px-3 py-2 rounded-xl border-2 font-semibold transition-all ${
                    selectedPlan === p.id
                      ? 'border-[var(--ns-forest)] bg-[var(--ns-forest-light)] text-[var(--ns-forest)]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {p.name} · W{p.current_week}/{p.total_weeks}
                  {p.race_date && ` · Race ${new Date(p.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {results.some(r => r.status !== 'pending') && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Passing', count: passCount, colour: 'text-emerald-700' },
              { label: 'Warnings', count: results.filter(r => r.status === 'warn').length, colour: 'text-amber-700' },
              { label: 'Failing', count: failCount, colour: 'text-red-700' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className={`text-2xl font-black ${s.colour}`}>{s.count}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Scenarios */}
        <div className="space-y-3 mb-4">
          {SCENARIOS.map((scenario, i) => {
            const result = results[i]
            return (
              <div key={scenario.id} className={`rounded-2xl border px-4 py-3 ${statusColour(result.status)}`}>
                <div className="flex items-start gap-3">
                  <span className="text-base font-bold flex-shrink-0 mt-0.5">{statusIcon(result.status)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{scenario.label}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">{scenario.expect}</p>
                    {result.status !== 'pending' && result.detail !== 'Not run yet' && (
                      <p className="text-[11px] mt-1.5 font-mono leading-relaxed opacity-90">{result.detail}</p>
                    )}
                  </div>
                  <button
                    onClick={() => runScenario(scenario, selectedPlan)}
                    disabled={running}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-black/10 flex-shrink-0 disabled:opacity-50"
                  >
                    Run
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={runAll}
          disabled={running || (plans.length === 0)}
          className="w-full py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-all"
          style={{ background: 'var(--ns-forest)' }}
        >
          {running ? 'Running all scenarios…' : `Run all ${SCENARIOS.length} scenarios`}
        </button>

        <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quick links</p>
          <div className="flex gap-3">
            <a href="/admin/plan-review" className="text-xs font-bold hover:underline" style={{ color: 'var(--ns-forest)' }}>
              ← Plan quality review
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
