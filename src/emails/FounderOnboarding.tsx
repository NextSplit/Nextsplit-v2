import { Text, Button, Section } from '@react-email/components'
import { NSEmailChrome, NSColours } from './_chrome'

// PR J15 — Personal welcome email from the founder at sign-up.
// Plain-text feeling (no big CTA banner) — supposed to feel like a
// real person reached out, not a marketing blast.

export function FounderOnboarding({ firstName }: {
  firstName: string
}) {
  return (
    <NSEmailChrome
      preview={`Welcome to NextSplit, ${firstName} — a quick note from the founder`}
      heading={`Welcome, ${firstName}`}>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.7, margin: '0 0 14px' }}>
        I&apos;m the founder of NextSplit and I&apos;m the one who built the
        thing you just signed up for. Thanks for trying it.
      </Text>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.7, margin: '0 0 14px' }}>
        The whole product is built around one idea: the number-one predictor
        of long-term running consistency is having <em>someone waiting for
        you</em>. Plans matter, but who notices when you don&apos;t show up
        matters more.
      </Text>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.7, margin: '0 0 14px' }}>
        If you have 5 minutes today, log your first session. The plan
        won&apos;t feel real until you do.
      </Text>
      <Section style={{ textAlign: 'center', margin: '24px 0' }}>
        <Button
          href="https://nextsplit.app/train"
          style={{
            backgroundColor: NSColours.EMBER,
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '14px',
            textDecoration: 'none',
            display: 'inline-block',
          }}>
          Open today&apos;s session
        </Button>
      </Section>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.7, margin: '16px 0 4px' }}>
        Reply to this email if anything&apos;s broken or confusing. I read every reply.
      </Text>
      <Text style={{ color: NSColours.TEXT, fontSize: '16px', lineHeight: 1.7, margin: '4px 0 0' }}>
        — Keep training, the rest follows.
      </Text>
    </NSEmailChrome>
  )
}

export default FounderOnboarding
