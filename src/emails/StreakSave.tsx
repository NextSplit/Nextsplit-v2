import { Text, Button, Section } from '@react-email/components'
import { NSEmailChrome, NSColours } from './_chrome'

// PR J15 — Streak-save email. Fires day-5 of no-log (gentler than push).
// Goal: bring the runner back without guilt-tripping.

export function StreakSave({ firstName, daysSinceLog }: {
  firstName: string
  daysSinceLog: number
}) {
  return (
    <NSEmailChrome
      preview={`Hey ${firstName} — your training plan's been waiting.`}
      heading={`${firstName}, the streak's still there`}>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>
        It&apos;s been {daysSinceLog} days since your last logged session.
        That&apos;s not a failure — it&apos;s a chance to start where you left off.
      </Text>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px' }}>
        Open the app, pick today&apos;s session, and log it — even if it&apos;s
        a 20-minute easy jog. Your plan adapts to what you actually do.
      </Text>
      <Section style={{ textAlign: 'center', margin: '24px 0' }}>
        <Button
          href="https://nextsplit.app/train"
          style={{
            backgroundColor: NSColours.EMBER,
            color: '#ffffff',
            padding: '14px 32px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '15px',
            textDecoration: 'none',
            display: 'inline-block',
          }}>
          Log today&apos;s run →
        </Button>
      </Section>
      <Text style={{ color: NSColours.MUTED, fontSize: '13px', lineHeight: 1.5, margin: '16px 0 0' }}>
        Consistency beats perfection. Always.
      </Text>
    </NSEmailChrome>
  )
}

export default StreakSave
