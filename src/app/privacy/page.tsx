import Link from 'next/link'
import { SUB_PROCESSORS } from '@/lib/legal/sub-processors'

export const metadata = {
  title:       'Privacy Policy — NextSplit',
  description: 'How NextSplit collects, uses and protects your personal data.',
  alternates:  { canonical: 'https://nextsplit.app/privacy' },
}

const LAST_UPDATED = 'May 2026'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <Link href="/" className="text-sm font-semibold hover:underline" style={{ color: 'var(--ns-ember)' }}>
            ← NextSplit
          </Link>
          <h1 className="text-3xl font-black mt-4" style={{ color: 'var(--color-text-primary)' }}>Privacy Policy</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div
          className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >

          <section id="who-we-are">
            <H2>Who we are</H2>
            <p>NextSplit (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a training platform for runners and endurance athletes. We are the data controller for personal data collected through nextsplit.app and associated mobile applications.</p>
            <p className="mt-2">We are registered with the UK Information Commissioner&rsquo;s Office (ICO). Our registration number is published here once issued. Contact for any privacy question or to exercise a right: <a href="mailto:privacy@nextsplit.com" className="underline" style={{ color: 'var(--ns-ember)' }}>privacy@nextsplit.com</a>.</p>
          </section>

          <section id="what-we-collect">
            <H2>What data we collect</H2>
            <div className="space-y-3">
              {[
                { title: 'Account data',    desc: 'Your name, email address and password (hashed and salted by Supabase Auth — we never see it in plain text).' },
                { title: 'Profile data',    desc: 'Age, biological sex, running experience and training preferences you provide during onboarding.' },
                { title: 'Health-related data', desc: 'Injury notes and health flags you choose to share during onboarding. Treated as special-category data under UK GDPR Article 9. See "Legal basis" below.' },
                { title: 'Training data',   desc: 'Session logs, distances, paces, heart rate, gym exercises, wellness check-ins, and race results you log in the app.' },
                { title: 'Goal data',       desc: 'Race goals, target times, and training objectives you set.' },
                { title: 'Strava data',     desc: 'If you connect Strava, we import your recent activity history to pre-fill your profile. Access tokens are stored encrypted at rest.' },
                { title: 'Usage data',      desc: 'Which features you use and how you navigate the app — only if you opt in to analytics cookies.' },
                { title: 'Diagnostic data', desc: 'Error reports and performance traces — only if you opt in to performance cookies. Error capture itself runs on legitimate interest with personal data stripped before forwarding.' },
                { title: 'Feedback',        desc: 'Messages you send via the in-app feedback widget.' },
                { title: 'Device data',     desc: 'Browser type, device type, and IP address for security and abuse prevention.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="font-bold shrink-0" style={{ color: 'var(--ns-ember)' }}>→</span>
                  <div><span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.title}:</span> {item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="legal-basis">
            <H2>Why we collect it (legal basis)</H2>
            <div className="space-y-2">
              <p><strong>Contract performance (UK GDPR Art. 6(1)(b)).</strong> We need your account, profile, training, and goal data to provide NextSplit — personalised plans, AI training suggestions, progress tracking.</p>
              <p><strong>Consent (UK GDPR Art. 6(1)(a) + PECR Reg. 6).</strong> Analytics cookies (PostHog) and performance / diagnostic cookies (Sentry traces and breadcrumbs) are only set after you accept them in the cookie banner. Notifications are sent only after you opt in.</p>
              <p><strong>Explicit consent for health data (UK GDPR Art. 9(2)(a)).</strong> Where you choose to enter injury notes or health flags during onboarding, we treat that as special-category data and rely on your explicit consent. You can edit or remove these at any time in Settings. This data is never sent to our AI service (see "AI and your data" below).</p>
              <p><strong>Legitimate interests (UK GDPR Art. 6(1)(f)).</strong> Security, fraud prevention, abuse detection, and unobtrusive error capture (the bare error event, with URL / cookies / breadcrumbs stripped).</p>
            </div>
          </section>

          <section id="how-we-use">
            <H2>How we use your data</H2>
            <ul className="space-y-1 list-disc list-inside">
              <li>Generate and personalise your training plan</li>
              <li>Provide informational AI training suggestions based on your training metrics (see "AI and your data")</li>
              <li>Calculate your pace zones, ACWR, and progress metrics</li>
              <li>Send notifications you have opted into</li>
              <li>Enable coach-athlete relationships (if you choose to connect with a coach)</li>
              <li>Improve the product through aggregated, anonymous usage analytics (only if you opted in)</li>
              <li>Respond to support requests and feedback</li>
            </ul>
          </section>

          <section id="ai-and-your-data">
            <H2>AI and your data</H2>
            <p>NextSplit uses the Anthropic Claude API to generate training suggestions and feedback. The data sent to the AI is limited to:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Training metrics — session history, distances, paces, ACWR, training-load summaries</li>
              <li>Goal data — race goals, target times, training objectives</li>
              <li>Non-sensitive profile fields — age band, running experience, training preferences</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> send your injury notes, health flags, wellness narrative notes, or any other special-category data to the AI. The AI output is informational only — it is not a diagnosis, a treatment recommendation, or a substitute for professional medical advice.</p>
            <p className="mt-2">Anthropic processes prompts under its own privacy policy and DPA. We have requested the Zero Data Retention API option; we do not use your data to train AI models.</p>
          </section>

          <section id="sub-processors">
            <H2>Sub-processors and third parties</H2>
            <p>We engage the following third parties to deliver NextSplit. Each entry below states whether the party acts as our processor (under our written instructions per UK GDPR Article 28) or as an independent controller, plus the transfer mechanism used where the party stores data outside the UK / EEA.</p>
            <div className="mt-3 space-y-2">
              {SUB_PROCESSORS.map(s => (
                <div key={s.name} className="flex gap-3">
                  <span className="font-bold shrink-0" style={{ color: 'var(--ns-ember)' }}>→</span>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
                    {' '}<span style={{ color: 'var(--color-text-tertiary)' }}>({s.relationship}, {s.category})</span>
                    {': '}{s.purpose}.
                    <span style={{ color: 'var(--color-text-tertiary)' }}> Region: {s.region}. {s.transfer}</span>
                    {' '}
                    <a href={s.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--ns-ember)' }}>Privacy</a>
                    {s.dpaUrl && (
                      <>
                        {' · '}
                        <a href={s.dpaUrl}  target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--ns-ember)' }}>DPA</a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3">We do not sell your data. We do not share your data with advertisers. We will update this list before adding any new sub-processor; existing users will be notified by email if a change is material.</p>
          </section>

          <section id="coach-data-sharing">
            <H2>Coach data sharing</H2>
            <p>If you connect with a Coach through NextSplit, the following data is shared with your coach when the relationship is active:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Training logs and session completion (on by default)</li>
              <li>Wellness check-ins and readiness scores (on by default)</li>
              <li>Nutrition diary (off by default — you opt in)</li>
              <li>Body weight logs (off by default — you opt in)</li>
            </ul>
            <p className="mt-2">You can revoke coach data access at any time in <Link href="/settings#work-with-a-coach" className="underline" style={{ color: 'var(--ns-ember)' }}>Settings → Work with a coach</Link>. When you revoke access, we stop sharing new data with the coach immediately. Coach messages that were already sent or received during the relationship are retained as part of the conversation record.</p>
          </section>

          <section id="data-retention">
            <H2>Data retention and deletion</H2>
            <p>We keep your data for as long as your account is active. When you request account deletion, we begin a 30-day grace period during which you can change your mind by signing back in. After the grace period your personal data is permanently deleted from our systems within a further 30 days.</p>
            <p className="mt-2">Two carve-outs apply:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong>Financial records.</strong> Where you have made or received a payment (Pro subscription, coach payouts), we retain the related invoice, transfer ID, and tax record for 6 years as required by HM Revenue &amp; Customs (Finance Act 2007 / Companies Act 2006). Other personal identifiers attached to these records are anonymised.</li>
              <li><strong>Third-party services.</strong> Sub-processors operate independent backup and audit-log cycles. Where a sub-processor cannot delete your data within the same 30-day window, we will tell you which sub-processor and what the residual retention period is on request.</li>
            </ul>
            <p className="mt-2">An audit trail of every deletion or export request (timestamp, IP, user-agent) is retained for the same 6-year window for ICO compliance evidence.</p>
          </section>

          <section id="your-rights">
            <H2>Your rights (UK GDPR)</H2>
            <p>If you are in the UK or EU, you have the right to:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong>Access</strong> — download all your data from <Link href="/settings" className="underline" style={{ color: 'var(--ns-ember)' }}>Settings &rsaquo; Export my data</Link></li>
              <li><strong>Rectification</strong> — edit your profile and data in-app at any time</li>
              <li><strong>Erasure</strong> — delete your account from <Link href="/settings" className="underline" style={{ color: 'var(--ns-ember)' }}>Settings &rsaquo; Delete account</Link>, subject to the carve-outs above</li>
              <li><strong>Portability</strong> — export your data in JSON format from Settings</li>
              <li><strong>Withdraw consent</strong> — turn off analytics or performance cookies, push notifications, or AI features at any time in Settings</li>
              <li><strong>Object</strong> — to processing based on legitimate interests, by emailing privacy@nextsplit.com</li>
              <li><strong>Restrict processing</strong> — pause processing while a query is resolved</li>
              <li><strong>Lodge a complaint</strong> with the UK Information Commissioner&rsquo;s Office: <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--ns-ember)' }}>ico.org.uk/make-a-complaint</a> · 0303 123 1113. You can complain to the ICO directly without contacting us first, but we would like the chance to address it.</li>
            </ul>
            <p className="mt-2">To exercise any right not available in-app, email <a href="mailto:privacy@nextsplit.com" className="underline" style={{ color: 'var(--ns-ember)' }}>privacy@nextsplit.com</a>. We will respond within 30 days. There is no charge for a reasonable request.</p>
          </section>

          <section id="cookies">
            <H2>Cookies and similar storage</H2>
            <p>NextSplit uses three categories of cookies and local storage, with separate controls for each. Your choice is shown in the cookie banner on first visit and can be changed any time in <Link href="/settings" className="underline" style={{ color: 'var(--ns-ember)' }}>Settings</Link>.</p>
            <div className="mt-3 space-y-2">
              <CookieCategory
                name="Essential"
                gated={false}
                purpose="Sign-in session, CSRF protection, the cookie-choice record itself, dark-mode preference."
                items="sb-access-token, sb-refresh-token, nextsplit_cookie_consent_v1, nextsplit_dark_mode"
              />
              <CookieCategory
                name="Analytics"
                gated
                purpose="Anonymous usage events — which screens, which features, where we lose people. Lets us prioritise improvements."
                items="PostHog distinct_id, ph_session_id"
              />
              <CookieCategory
                name="Performance"
                gated
                purpose="Crash and performance traces (Sentry). Error capture itself runs on legitimate interest; this category covers the surrounding navigational context — URLs, breadcrumbs, and request metadata — that would otherwise identify you."
                items="Sentry session-scope identifiers"
              />
            </div>
            <p className="mt-3">We re-ask for your cookie choice when our categories change materially. We do not use advertising cookies or share cookie data with advertisers.</p>
          </section>

          <section id="security">
            <H2>Security</H2>
            <p>All data is transmitted over HTTPS. Passwords are hashed and salted by Supabase Auth using a modern key-derivation function. Database access is protected by Row Level Security (RLS) — every user can only access their own data. We use Sentry to monitor and respond to errors. Personal data breaches are reported to the ICO within 72 hours where required by UK GDPR Article 33.</p>
          </section>

          <section id="international-transfers">
            <H2>International transfers</H2>
            <p>Where a sub-processor stores data outside the UK or EEA, we rely on either an adequacy decision (EEA), the EU Standard Contractual Clauses with the UK International Data Transfer Addendum, or the UK ICO International Data Transfer Agreement (IDTA). The specific mechanism for each sub-processor is shown in the &ldquo;Sub-processors and third parties&rdquo; section above.</p>
          </section>

          <section id="age">
            <H2>Age</H2>
            <p>NextSplit is intended for users aged 16 and over. We do not knowingly collect data from anyone under 16. If you believe a minor has created an account, please email privacy@nextsplit.com and we will delete the account and associated data.</p>
          </section>

          <section id="changes">
            <H2>Changes to this policy</H2>
            <p>We will notify you of significant changes via email or in-app notification. The &ldquo;last updated&rdquo; date at the top of this page reflects the most recent revision.</p>
          </section>

          <section id="contact">
            <H2>Contact</H2>
            <p>For privacy questions or to exercise your rights: <a href="mailto:privacy@nextsplit.com" className="underline" style={{ color: 'var(--ns-ember)' }}>privacy@nextsplit.com</a></p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t flex flex-wrap gap-4 text-sm" style={{ borderColor: 'var(--color-border)' }}>
          <Link href="/terms"    className="underline" style={{ color: 'var(--ns-ember)' }}>Terms of Service</Link>
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

function CookieCategory({ name, gated, purpose, items }: {
  name:    string
  gated:   boolean
  purpose: string
  items:   string
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{name}</span>
        <span
          className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
          style={{
            color:      gated ? 'var(--ns-cyan)' : 'var(--ns-ember)',
            background: gated ? 'var(--ns-cyan-light)' : 'rgba(255,116,56,0.12)',
          }}
        >
          {gated ? 'Opt-in' : 'Always on'}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{purpose}</p>
      <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--color-text-tertiary)' }}>{items}</p>
    </div>
  )
}
