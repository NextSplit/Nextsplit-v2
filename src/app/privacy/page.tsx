import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — NextSplit',
  description: 'How NextSplit collects, uses and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-[var(--ns-ember)] text-sm font-semibold hover:underline">← NextSplit</Link>
          <h1 className="text-3xl font-black text-gray-900 mt-4">Privacy Policy</h1>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-2">Last updated: 14 May 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Who we are</h2>
            <p>NextSplit (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a training platform for runners and endurance athletes. We are the data controller for personal data collected through nextsplit.app and associated mobile applications.</p>
            <p className="mt-2">NextSplit is currently in pre-launch development. Once we begin processing personal data for paying users, we will register with the UK Information Commissioner&rsquo;s Office (ICO) as a data controller and update this policy with our registration number. Until then, all data is test data from internal builds and friend testers who have explicitly consented.</p>
            <p className="mt-2">Contact: <a href="mailto:privacy@nextsplit.com" className="text-[var(--ns-ember)] hover:underline">privacy@nextsplit.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">What data we collect</h2>
            <div className="space-y-3">
              {[
                { title: 'Account data', desc: 'Your name, email address and password (hashed — we never see it in plain text).' },
                { title: 'Profile data', desc: 'Age, biological sex, injury notes, health flags, running experience, and training preferences you provide during onboarding.' },
                { title: 'Training data', desc: 'Session logs, distances, paces, heart rate, gym exercises, wellness check-ins, and race results you log in the app.' },
                { title: 'Goal data', desc: 'Race goals, target times, and training objectives you set.' },
                { title: 'Strava data', desc: 'If you connect Strava, we import your recent activity history to pre-fill your profile. We store access tokens securely.' },
                { title: 'Usage data', desc: 'Which features you use, how you navigate the app, and error logs. We use PostHog analytics and Sentry error monitoring.' },
                { title: 'Feedback', desc: 'Messages you send via the in-app feedback widget.' },
                { title: 'Device data', desc: 'Browser type, device type, and IP address for security and analytics purposes.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-[var(--ns-ember)] font-bold shrink-0">→</span>
                  <div><span className="font-semibold text-gray-800">{item.title}:</span> {item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Why we collect it (legal basis)</h2>
            <div className="space-y-2">
              <p><strong>Contract performance:</strong> We need your account and training data to provide the NextSplit service — personalised plans, AI coaching, progress tracking.</p>
              <p><strong>Legitimate interests:</strong> We use usage analytics to improve the product and error monitoring to fix bugs.</p>
              <p><strong>Consent:</strong> We ask for your consent before sending push notifications. You can withdraw consent at any time in Settings.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">How we use your data</h2>
            <ul className="space-y-1 list-disc list-inside">
              <li>Generate and personalise your training plan</li>
              <li>Provide AI coaching feedback based on your actual training data</li>
              <li>Calculate your pace zones, ACWR, and progress metrics</li>
              <li>Send push notifications you have opted into</li>
              <li>Enable coach-athlete relationships (if you choose to connect with a coach)</li>
              <li>Improve the product through aggregated, anonymised usage analytics</li>
              <li>Respond to support requests and feedback</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">AI and your data</h2>
            <p>NextSplit uses the Anthropic Claude API for several AI-powered features:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Generating and adapting your training plan</li>
              <li>Conversational AI coach (asking &ldquo;what should I run tomorrow?&rdquo;)</li>
              <li>Race-day pacing strategy from weather + course profile</li>
              <li>Post-run feedback on logged sessions</li>
              <li>Strength + mobility exercise prescription</li>
            </ul>
            <p className="mt-2">Your training data, profile, goals, and (for voice features) audio prompts are sent to the Claude API to generate personalised responses. Where voice synthesis is used, we additionally engage ElevenLabs as a sub-processor (listed below).</p>
            <p className="mt-2">Anthropic and ElevenLabs are bound by their own privacy policies and DPAs. We do not authorise either to use your data to train their AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Sub-processors (Article 28 GDPR)</h2>
            <p>We engage the following data processors under written contracts that meet the UK GDPR Article 28 requirements. Each link below points to that processor&rsquo;s data processing agreement (DPA) and privacy policy.</p>
            <div className="mt-3 space-y-2">
              {[
                { name: 'Supabase',  purpose: 'Database, authentication, file storage', region: 'EU (Frankfurt)',     link: 'https://supabase.com/privacy', dpa: 'https://supabase.com/legal/dpa' },
                { name: 'Anthropic', purpose: 'AI coaching + plan generation (Claude API)', region: 'US — UK SCCs in place', link: 'https://www.anthropic.com/privacy', dpa: 'https://www.anthropic.com/legal/dpa' },
                { name: 'Vercel',    purpose: 'Hosting and edge network (CDN)',         region: 'Global edge — UK SCCs in place', link: 'https://vercel.com/legal/privacy-policy', dpa: 'https://vercel.com/legal/dpa' },
                { name: 'PostHog',   purpose: 'Product analytics (event-level)',         region: 'EU (Frankfurt)',     link: 'https://posthog.com/privacy', dpa: 'https://posthog.com/dpa' },
                { name: 'Sentry',    purpose: 'Error and performance monitoring',        region: 'US — UK SCCs in place', link: 'https://sentry.io/privacy/', dpa: 'https://sentry.io/legal/dpa/' },
                { name: 'Strava',    purpose: 'Activity import (only if you connect)',   region: 'US — UK SCCs in place', link: 'https://www.strava.com/legal/privacy', dpa: 'https://www.strava.com/legal/api' },
                { name: 'Stripe',    purpose: 'Payment processing (if you subscribe)',  region: 'US/IE — UK SCCs in place', link: 'https://stripe.com/gb/privacy', dpa: 'https://stripe.com/gb/legal/dpa' },
                { name: 'Resend',    purpose: 'Transactional email delivery',           region: 'US — UK SCCs in place', link: 'https://resend.com/privacy', dpa: 'https://resend.com/legal/dpa' },
                { name: 'OpenWeatherMap', purpose: 'Weather forecasts for sessions + races (no PII sent — coordinates only)', region: 'EU', link: 'https://openweather.co.uk/privacy-policy', dpa: 'https://openweather.co.uk/privacy-policy' },
                { name: 'Inngest',   purpose: 'Background workflow execution (scheduled jobs)', region: 'US — UK SCCs in place', link: 'https://www.inngest.com/privacy', dpa: 'https://www.inngest.com/dpa' },
                { name: 'ElevenLabs', purpose: 'Voice synthesis (optional AI voice coach features only)', region: 'US — UK SCCs in place', link: 'https://elevenlabs.io/privacy', dpa: 'https://elevenlabs.io/dpa' },
              ].map(s => (
                <div key={s.name} className="flex gap-3">
                  <span className="text-[var(--ns-ember)] font-bold shrink-0">→</span>
                  <div>
                    <span className="font-semibold text-gray-800">{s.name}:</span> {s.purpose}.
                    <span className="text-[var(--color-text-tertiary)]"> Region: {s.region}.</span>
                    {' '}
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-[var(--ns-ember)] hover:underline">Privacy</a>
                    {' · '}
                    <a href={s.dpa}  target="_blank" rel="noopener noreferrer" className="text-[var(--ns-ember)] hover:underline">DPA</a>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3">We do not sell your data. We do not share your data with advertisers. We will update this list before adding any new sub-processor; existing users will be notified by email if a change is material.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Coach data sharing</h2>
            <p>If you connect with a Professional Coach through NextSplit, the following data is shared with your coach when the relationship is active:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Training logs and session completion (on by default)</li>
              <li>Wellness check-ins and readiness scores (on by default)</li>
              <li>Nutrition diary (off by default — you opt in)</li>
              <li>Body weight logs (off by default — you opt in)</li>
            </ul>
            <p className="mt-2">You can revoke coach data access at any time in Settings → Coach Access.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Data retention</h2>
            <p>We keep your data for as long as your account is active. When you tap &ldquo;Delete account&rdquo; in Settings, your request enters a 30-day grace period — you can cancel during this window if you change your mind. After 30 days, all personal data is permanently deleted: training logs, wellness data, goals, profile information, and any data held by sub-processors that we control.</p>
            <p className="mt-2">A short audit log of account-lifecycle events (deletion requested, deletion processed, data exported) is retained for one year after deletion for legal-compliance purposes. This log does not contain training data — only timestamps and the type of event.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Your rights (GDPR)</h2>
            <p>If you are in the UK or EU, you have the right to:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong>Access</strong> — download all your data from Settings → Export my data</li>
              <li><strong>Rectification</strong> — edit your profile and data in-app at any time</li>
              <li><strong>Erasure</strong> — delete your account from Settings → Delete account</li>
              <li><strong>Portability</strong> — export your data in JSON format from Settings</li>
              <li><strong>Withdraw consent</strong> — turn off notifications in Settings at any time</li>
              <li><strong>Object</strong> — contact us at privacy@nextsplit.com to object to any processing</li>
            </ul>
            <p className="mt-2">To exercise any right not available in-app, email <a href="mailto:privacy@nextsplit.com" className="text-[var(--ns-ember)] hover:underline">privacy@nextsplit.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Cookies and tracking</h2>
            <p>We use three categories of cookies and tracking technologies:</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-semibold text-gray-800">Strictly necessary (no consent needed)</p>
                <p className="text-[var(--color-text-tertiary)] mt-0.5">Supabase session cookies for keeping you logged in. Without these the service cannot function.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Analytics (consent required)</p>
                <p className="text-[var(--color-text-tertiary)] mt-0.5">PostHog sets a cookie to identify returning users for product-improvement purposes. We only set this cookie after you tap &ldquo;Accept analytics&rdquo; in the consent banner. You can revoke this at any time in Settings.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Error monitoring (legitimate interest)</p>
                <p className="text-[var(--color-text-tertiary)] mt-0.5">Sentry captures error reports to help us fix bugs. We do not set tracking cookies for this. If you decline analytics consent, we additionally strip URL and navigational context from error events.</p>
              </div>
            </div>
            <p className="mt-3">We do not use advertising cookies. We do not track you across other sites.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Security</h2>
            <p>All data is transmitted over HTTPS. Passwords are hashed using industry-standard bcrypt. Database access is protected by Row Level Security (RLS) — every user can only access their own data. We use Sentry to monitor and respond to security incidents.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Changes to this policy</h2>
            <p>We will notify you of significant changes via email or in-app notification. The &ldquo;last updated&rdquo; date at the top of this page reflects the most recent revision.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Contact</h2>
            <p>For privacy questions or to exercise your rights: <a href="mailto:privacy@nextsplit.com" className="text-[var(--ns-ember)] hover:underline">privacy@nextsplit.com</a></p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-[var(--color-border)] flex gap-4 text-sm">
          <Link href="/terms" className="text-[var(--ns-ember)] hover:underline">Terms of Service</Link>
          <Link href="/" className="text-[var(--color-text-tertiary)] hover:underline">Back to NextSplit</Link>
        </div>
      </div>
    </main>
  )
}
