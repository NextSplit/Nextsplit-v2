'use client'

// Race-week fuelling protocol. Renders only when the user has a race_date and
// it's within 7 days. Outside that window, shows the steady-state framing so
// the fuel tab isn't gutted when no race is set. Defaults to the endurance
// (half/marathon) protocol — distance-aware tailoring can come later once
// race_distance_km is wired through from UserGoal.

interface Props {
  raceDate: string | null
}

function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00')
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export default function RaceWeekFuelCard({ raceDate }: Props) {
  if (!raceDate) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ns-cobalt)' }}>
          🥗 Fuel & Nutrition
        </p>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Daily fuel timing for your training is below. Set a goal race in your plan and the race-week protocol unlocks 7 days out.
        </p>
      </div>
    )
  }

  const days = daysUntil(raceDate)

  // Past race or > 7 days out — show countdown framing only.
  if (days < 0 || days > 7) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ns-cobalt)' }}>
          🥗 Fuel & Nutrition
        </p>
        {days > 7 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {days} days to your race. Race-week fuelling protocol unlocks in {days - 7} day{days - 7 === 1 ? '' : 's'}. Daily fuel timing below.
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Daily fuel timing for your training is below.
          </p>
        )}
      </div>
    )
  }

  // Race-week. Default to endurance (carb-load) protocol — the dominant
  // race-training case on NextSplit.
  const dayWord = days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `IN ${days} DAYS`

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '2px solid var(--ns-cobalt)' }}>
      <div className="px-4 py-3" style={{ background: 'var(--ns-cobalt)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
          🏁 Race Week
        </p>
        <p className="text-base font-bold text-white mt-0.5">
          Race day {dayWord.toLowerCase()}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {days >= 1 && (
          <Section title="🍝 Carb load" subtitle="Days -3 to -1">
            <Bullet>Lift carbs to <strong>7–10 g/kg/day</strong> (rice, pasta, bread, potatoes, oats).</Bullet>
            <Bullet>Cut fibre + fat — they slow digestion and risk race-morning GI.</Bullet>
            <Bullet>Expect 1–2 kg weight gain. That&apos;s water + glycogen, not fat.</Bullet>
            <Bullet>Sip water steadily. Pale-yellow pee = good.</Bullet>
          </Section>
        )}

        {days <= 1 && (
          <Section title="🌙 Night before" subtitle="Day -1, evening">
            <Bullet>Eat dinner by 8pm. Familiar food only.</Bullet>
            <Bullet>Lay out kit, pin bib, pre-set gels in pockets.</Bullet>
            <Bullet>Set 2 alarms. Aim to wake 3–4h before gun.</Bullet>
          </Section>
        )}

        {days === 0 && (
          <>
            <Section title="🍌 Race morning" subtitle="3–4h before gun">
              <Bullet>Breakfast: <strong>1–4 g/kg carbs</strong>. Oats + banana + honey, or toast + jam. No new foods.</Bullet>
              <Bullet>500ml water with breakfast. Stop drinking 90 min before the gun.</Bullet>
              <Bullet>Coffee if you train with it. Not if you don&apos;t.</Bullet>
            </Section>

            <Section title="🏃 During the race" subtitle="From the start line">
              <Bullet>Sip water at every station.</Bullet>
              <Bullet>For races over 60 min: <strong>30–60 g carbs/hr</strong>. Gel every 25–30 min.</Bullet>
              <Bullet>Pacing: hold yourself back the first third. You&apos;ll thank yourself later.</Bullet>
            </Section>

            <Section title="🔄 After the finish" subtitle="Within 30 min">
              <Bullet>Carbs + protein, 3:1 ratio. Chocolate milk, recovery shake, or banana + nut butter.</Bullet>
              <Bullet>Walk for 10 min. Don&apos;t sit down straight away.</Bullet>
            </Section>
          </>
        )}

        <p className="text-[10px] leading-relaxed pt-1 border-t" style={{ color: 'var(--color-text-tertiary)', borderColor: 'var(--color-border)' }}>
          Guidance only. If you have a medical condition or special diet, follow your clinician&apos;s advice.
        </p>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{subtitle}</p>
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-xs leading-relaxed flex gap-2" style={{ color: 'var(--color-text-secondary)' }}>
      <span aria-hidden="true" style={{ color: 'var(--ns-cobalt)' }}>•</span>
      <span>{children}</span>
    </li>
  )
}
