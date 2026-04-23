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
          <p className="text-gray-500 text-sm mt-2">Last updated: April 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Who we are</h2>
            <p>NextSplit (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a training platform for runners and endurance athletes. We are the data controller for personal data collected through nextsplit.app and associated mobile applications.</p>
            <p className="mt-2">Registered in England and Wales. ICO registration number: <strong>[UPDATE AFTER REGISTRATION]</strong>.</p>
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
            <p>NextSplit uses the Anthropic Claude API to generate training plans and provide coaching feedback. Your training data, profile information and goals are sent to the Claude API to generate personalised responses.</p>
            <p className="mt-2">Anthropic's data processing is governed by their own privacy policy. We do not use your data to train AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Who we share data with</h2>
            <div className="space-y-2">
              {[
                { name: 'Supabase', purpose: 'Database and authentication (EU region)', link: 'https://supabase.com/privacy' },
                { name: 'Anthropic', purpose: 'AI coaching and plan generation', link: 'https://www.anthropic.com/privacy' },
                { name: 'Vercel', purpose: 'Hosting and edge network', link: 'https://vercel.com/legal/privacy-policy' },
                { name: 'PostHog', purpose: 'Product analytics (EU-hosted)', link: 'https://posthog.com/privacy' },
                { name: 'Sentry', purpose: 'Error monitoring', link: 'https://sentry.io/privacy/' },
                { name: 'Strava', purpose: 'Activity import (only if you connect)', link: 'https://www.strava.com/legal/privacy' },
                { name: 'Stripe', purpose: 'Payment processing (if you subscribe)', link: 'https://stripe.com/gb/privacy' },
              ].map(s => (
                <div key={s.name} className="flex gap-3">
                  <span className="text-[var(--ns-ember)] font-bold shrink-0">→</span>
                  <div><span className="font-semibold text-gray-800">{s.name}:</span> {s.purpose}. <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-[var(--ns-ember)] hover:underline">Privacy policy</a></div>
                </div>
              ))}
            </div>
            <p className="mt-3">We do not sell your data. We do not share your data with advertisers.</p>
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
            <p>We keep your data for as long as your account is active. When you delete your account, all personal data is permanently deleted within 30 days, including training logs, wellness data, goals, and profile information.</p>
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
            <p>We use essential cookies for authentication (Supabase session cookies). We use PostHog for analytics, which sets a cookie to identify returning users for product improvement purposes. We do not use advertising cookies.</p>
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

        <div className="mt-12 pt-6 border-t border-gray-100 flex gap-4 text-sm">
          <Link href="/terms" className="text-[var(--ns-ember)] hover:underline">Terms of Service</Link>
          <Link href="/" className="text-gray-400 hover:underline">Back to NextSplit</Link>
        </div>
      </div>
    </main>
  )
}
