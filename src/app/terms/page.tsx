import Link from 'next/link'

export const metadata = {
  title:       'Terms of Service — NextSplit',
  description: 'NextSplit terms of service and acceptable use policy.',
  alternates:  { canonical: 'https://nextsplit.app/terms' },
}

const LAST_UPDATED = 'May 2026'

export default function TermsPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <Link href="/" className="text-sm font-semibold hover:underline" style={{ color: 'var(--ns-ember)' }}>
            ← NextSplit
          </Link>
          <h1 className="text-3xl font-black mt-4" style={{ color: 'var(--color-text-primary)' }}>Terms of Service</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div
          className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >

          <section id="agreement">
            <H2>1. Agreement</H2>
            <p>By creating a NextSplit account, you agree to these Terms of Service. If you do not agree, do not use NextSplit. These terms apply to all users — athletes and coaches.</p>
          </section>

          <section id="service">
            <H2>2. The service</H2>
            <p>NextSplit provides training planning, AI training suggestions, progress tracking, and a coach-athlete marketplace for runners and endurance athletes. We may modify, suspend or discontinue any feature with reasonable notice. Where a change materially reduces a paid feature, you may cancel and we will refund any unused prepaid period on a pro-rata basis.</p>
          </section>

          <section id="account">
            <H2>3. Account</H2>
            <p>You must be 16 or older to create an account. You are responsible for keeping your account credentials secure and for all activity under your account. Notify us immediately at <a href="mailto:support@nextsplit.com" className="underline" style={{ color: 'var(--ns-ember)' }}>support@nextsplit.com</a> if you suspect unauthorised access.</p>
          </section>

          <section id="subscriptions">
            <H2>4. Subscriptions, payments and refunds</H2>
            <div className="space-y-2">
              <p><strong>NextSplit Pro.</strong> Founding rate £7.99/month or £79.99/year (first 500 subscribers). Standard rate £9.99/month or £99.99/year. Billed via Stripe. Cancel any time in Settings; cancellation takes effect at the end of the current billing period.</p>
              <p><strong>Professional Coach platform fee.</strong> £29/month. Cancel any time. Cancellation takes effect at the end of the current period.</p>
              <p><strong>Coaching subscriptions and plans.</strong> Set by the coach, billed via Stripe Connect. Cancel any time to stop future billing. Coach plans have a 14-day refund window if the plan has not been activated — contact support@nextsplit.com.</p>
              <p><strong>14-day right to cancel (UK Consumer Contracts Regulations 2013).</strong> If you live in the UK or EU, you have 14 days from the date you start a paid subscription to cancel and receive a full refund. <em>By starting to use the paid features within those 14 days you are expressly consenting to immediate performance of the contract and acknowledging that, where you cancel after use has begun, we may charge for the portion of the service already used.</em> A clearer summary, and a one-click cancel link, are shown at checkout.</p>
              <p><strong>VAT.</strong> Prices shown are inclusive of UK VAT where applicable. The Stripe-hosted checkout shows the inclusive total before you confirm.</p>
              <p><strong>Founding rate anchor.</strong> If you hold a founding-rate subscription, the founding rate stays with you for as long as the subscription remains active. If a payment fails, we will retry and notify you before the subscription is treated as cancelled — your founding rate is not lost while the subscription is in dunning. If you cancel and resubscribe later, the prevailing rate at that time applies.</p>
            </div>
          </section>

          <section id="marketplace">
            <H2>5. Coach marketplace</H2>
            <div className="space-y-2">
              <p>Coaches are independent professionals. You contract with the coach directly for any coaching services you purchase. NextSplit provides the platform that connects you and processes payments via Stripe Connect.</p>
              <p><strong>Revenue split.</strong> The commercial relationship between NextSplit and individual coaches (including platform fees and revenue share for coaching subscriptions and plan sales) is governed by the separate Coach Agreement that each coach accepts at onboarding. Those terms are not part of this athlete-facing document.</p>
              <p><strong>Verification.</strong> Where a coach is marked as &ldquo;verified&rdquo;, we have reviewed the credentials they provided to us. Verification confirms credential authenticity at the time of review; it is not an endorsement of any individual plan or coaching session.</p>
              <p><strong>Disputes.</strong> Disputes about coaching services should be raised with the coach first. If you cannot resolve a dispute directly, contact <a href="mailto:support@nextsplit.com" className="underline" style={{ color: 'var(--ns-ember)' }}>support@nextsplit.com</a>; we will mediate where we can. Nothing in this clause removes your statutory rights under the UK Consumer Rights Act 2015.</p>
            </div>
          </section>

          <section id="ai">
            <H2>6. AI training suggestions</H2>
            <p>NextSplit&rsquo;s AI features generate <strong>informational training suggestions</strong> from your training metrics (session history, paces, training load). The AI does not see your injury notes or health flags. AI output is not a diagnosis, not a treatment recommendation, and not a substitute for professional medical or coaching advice.</p>
            <p className="mt-2"><strong>Listen to your body.</strong> Normal training discomfort — muscle fatigue, breathlessness during hard efforts, post-session soreness (DOMS) — is expected and part of the work. Stop a session and seek medical advice if you experience <strong>sharp, localised, or worsening pain, neurological symptoms (numbness, tingling), or any pain that changes your gait</strong>. Do not run on a suspected injury because an AI suggestion is in your plan.</p>
            <p className="mt-2">If you have a known medical condition, are returning from injury, are pregnant, or are under medical supervision, consult your doctor before starting or changing a training programme.</p>
          </section>

          <section id="acceptable-use">
            <H2>7. Acceptable use</H2>
            <p>You must not:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Harass, abuse, threaten, or spam other users or coaches</li>
              <li>Impersonate another person or coach</li>
              <li>Submit false credentials for coach verification</li>
              <li>Attempt to access other users&rsquo; data</li>
              <li>Use automated tools to generate fake activity logs</li>
              <li>Reverse engineer, scrape or abuse the API</li>
              <li>Use NextSplit for any unlawful purpose</li>
            </ul>
            <p className="mt-2">Violation may result in immediate account suspension or termination. Where we suspend an account, you retain the right to access and export your data — contact <a href="mailto:privacy@nextsplit.com" className="underline" style={{ color: 'var(--ns-ember)' }}>privacy@nextsplit.com</a>.</p>
          </section>

          <section id="data">
            <H2>8. Data and privacy</H2>
            <p>Your use of NextSplit is also governed by our <Link href="/privacy" className="underline" style={{ color: 'var(--ns-ember)' }}>Privacy Policy</Link>. You own your training data. We do not sell it. You can export or delete it at any time, subject to the retention carve-outs in the Privacy Policy.</p>
          </section>

          <section id="ip">
            <H2>9. Intellectual property</H2>
            <p>NextSplit&rsquo;s software, brand, and content are owned by NextSplit and protected by copyright. Coach-authored training plans remain the intellectual property of the coach. You may not redistribute or resell plans purchased from the marketplace.</p>
          </section>

          <section id="liability">
            <H2>10. Limitation of liability</H2>
            <p><strong>Nothing in these terms excludes or limits our liability for: (a) death or personal injury caused by our negligence; (b) fraud or fraudulent misrepresentation; or (c) any other liability which cannot be excluded or limited under UK law.</strong> This carve-out reflects section 2(1) of the Unfair Contract Terms Act 1977 and the corresponding provisions of the Consumer Rights Act 2015.</p>
            <p className="mt-2">Subject to that, and to the maximum extent permitted by law, NextSplit&rsquo;s total liability to you arising under or in connection with these terms (whether in contract, tort, or otherwise) is limited to the amount you paid us in the 12 months preceding the claim, and we are not liable for indirect, incidental, or consequential losses of profits, revenue, or data.</p>
          </section>

          <section id="termination">
            <H2>11. Termination</H2>
            <p>You may delete your account at any time in <Link href="/settings" className="underline" style={{ color: 'var(--ns-ember)' }}>Settings &rsaquo; Delete account</Link>. We may suspend or terminate accounts that violate these terms; we will give you reasonable notice and the chance to export your data first, except where immediate action is necessary to protect users or comply with the law. On termination, your data is deleted per the retention schedule in our Privacy Policy.</p>
          </section>

          <section id="governing-law">
            <H2>12. Governing law</H2>
            <p>These terms are governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales. If you live in Scotland or Northern Ireland, you may bring proceedings in your local courts.</p>
          </section>

          <section id="contact">
            <H2>13. Contact</H2>
            <p>Questions about these terms: <a href="mailto:legal@nextsplit.com" className="underline" style={{ color: 'var(--ns-ember)' }}>legal@nextsplit.com</a></p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t flex flex-wrap gap-4 text-sm" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/privacy"  className="underline" style={{ color: 'var(--ns-ember)' }}>Privacy Policy</Link>
          <Link href="/settings" className="underline" style={{ color: 'var(--ns-ember)' }}>Settings</Link>
          <Link href="/"         className="underline" style={{ color: 'var(--color-text-tertiary)' }}>Back to NextSplit</Link>
        </div>
      </div>
    </main>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
      {children}
    </h2>
  )
}
