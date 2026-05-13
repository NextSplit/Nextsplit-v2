// PR J15 — shared chrome for all NextSplit transactional emails.
// Brand-matches the app: deep navy `#0a0e1a` accents (kept light for
// inbox legibility — full-bleed dark is hostile to most clients).

import {
  Html, Head, Preview, Body, Container, Section, Heading, Text, Link, Hr,
} from '@react-email/components'
import type { ReactNode } from 'react'

const EMBER  = '#ff7438'
const NAVY   = '#0a0e1a'
const CREAM  = '#fef9e7'
const TEXT   = '#1a1a1a'
const MUTED  = '#666'

export function NSEmailChrome({
  preview, heading, children,
}: { preview: string; heading: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '24px auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* Navy header bar with ember stripe */}
          <Section style={{ backgroundColor: NAVY, padding: '24px 32px', borderBottom: `4px solid ${EMBER}` }}>
            <Heading as="h1" style={{ color: '#ffffff', margin: 0, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em' }}>
              NextSplit
            </Heading>
            <Text style={{ color: CREAM, margin: '4px 0 0', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Someone is waiting for you
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '32px' }}>
            <Heading as="h2" style={{ color: TEXT, fontSize: '24px', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {heading}
            </Heading>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e5e5e5', margin: 0 }} />
          <Section style={{ padding: '20px 32px', backgroundColor: '#fafafa' }}>
            <Text style={{ color: MUTED, fontSize: '11px', margin: 0, lineHeight: 1.5 }}>
              You&apos;re receiving this because you have an active NextSplit account.{' '}
              <Link href="https://nextsplit.app/settings?section=notifications"
                style={{ color: EMBER, textDecoration: 'underline' }}>
                Manage notifications
              </Link>{' '}
              or{' '}
              <Link href="https://nextsplit.app/settings?section=notifications#unsubscribe"
                style={{ color: EMBER, textDecoration: 'underline' }}>
                unsubscribe
              </Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const NSColours = { EMBER, NAVY, CREAM, TEXT, MUTED }
