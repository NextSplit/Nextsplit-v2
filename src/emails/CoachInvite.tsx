import { Text, Button, Section } from '@react-email/components'
import { NSEmailChrome, NSColours } from './_chrome'

// PR J15 — Coach-invite email. Fires when an athlete adds a coach
// (via /coach/[slug] connect flow).

export function CoachInvite({ athleteName, coachName, acceptUrl }: {
  athleteName: string
  coachName:   string
  acceptUrl:   string
}) {
  return (
    <NSEmailChrome
      preview={`${athleteName} wants to train with you`}
      heading={`${athleteName} has invited you to coach them`}>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>
        Hi {coachName},
      </Text>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.6, margin: '0 0 16px' }}>
        <strong>{athleteName}</strong> would like you to be their coach on
        NextSplit. Once you accept, you&apos;ll see their plan, logs,
        wellness check-ins, and AI digest in your coach dashboard.
      </Text>
      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button
          href={acceptUrl}
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
          Accept invitation →
        </Button>
      </Section>
      <Text style={{ color: NSColours.MUTED, fontSize: '13px', lineHeight: 1.5, margin: '0' }}>
        If you didn&apos;t expect this invitation you can safely ignore it.
        The link expires in 7 days.
      </Text>
    </NSEmailChrome>
  )
}

export default CoachInvite
