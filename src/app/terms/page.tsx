import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — NextSplit',
  description: 'NextSplit terms of service and acceptable use policy.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-10">
          <Link href="/" className="text-[var(--ns-ember)] text-sm font-semibold hover:underline">← NextSplit</Link>
          <h1 className="text-3xl font-black text-gray-900 mt-4">Terms of Service</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: April 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Agreement</h2>
            <p>By creating a NextSplit account, you agree to these Terms of Service. If you do not agree, do not use NextSplit. These terms apply to all users — athletes, Split Leaders, and Professional Coaches.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. The service</h2>
            <p>NextSplit provides training planning, AI coaching, progress tracking, and a coach-athlete marketplace for runners and endurance athletes. We reserve the right to modify, suspend or discontinue any feature at any time with reasonable notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Account</h2>
            <p>You must be 16 or older to create an account. You are responsible for keeping your account credentials secure and for all activity under your account. Notify us immediately at support@nextsplit.com if you suspect unauthorised access.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Subscriptions and payments</h2>
            <div className="space-y-2">
              <p><strong>NextSplit Pro</strong> — £7.99/month or £59/year, billed via Stripe. Cancel anytime in Settings. No refunds for partial billing periods.</p>
              <p><strong>Professional Coach platform fee</strong> — £29/month. Cancel anytime. No refunds for partial periods.</p>
              <p><strong>Coach plans</strong> — purchased plans have a 14-day refund window if the plan has not been activated. Contact support@nextsplit.com to request a refund.</p>
              <p><strong>Coaching subscriptions</strong> — set by the coach, billed via Stripe Connect. No refunds; cancel anytime to stop future billing.</p>
              <p>Prices may change with 30 days notice. Continued use after a price change constitutes acceptance.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Coach marketplace</h2>
            <div className="space-y-2">
              <p><strong>Coaches</strong> are independent professionals. NextSplit is a platform, not a coaching service. We do not guarantee the quality, safety or accuracy of any coaching advice.</p>
              <p><strong>Revenue split:</strong> NextSplit takes 20% of ongoing coaching subscription revenue and 30% of plan purchases. Coaches receive the remainder via Stripe Connect.</p>
              <p><strong>Verified coaches</strong> have had credentials reviewed by NextSplit. Verification does not constitute endorsement or guarantee of service quality.</p>
              <p><strong>Disputes</strong> between coaches and athletes should be resolved directly. NextSplit may mediate but is not obligated to.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. AI coaching</h2>
            <p>AI coaching responses are generated automatically and are not a substitute for professional medical or coaching advice. Do not follow training suggestions that cause pain or discomfort. NextSplit is not liable for injuries resulting from following AI-generated training plans. Consult a doctor before starting any new exercise programme.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Acceptable use</h2>
            <p>You must not:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Use NextSplit for any unlawful purpose</li>
              <li>Attempt to access other users' data</li>
              <li>Reverse engineer, scrape or abuse the API</li>
              <li>Impersonate another person or coach</li>
              <li>Submit false credentials for coach verification</li>
              <li>Harass, abuse or spam other users</li>
              <li>Use automated tools to generate fake activity logs</li>
            </ul>
            <p className="mt-2">Violation may result in immediate account termination without refund.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Data and privacy</h2>
            <p>Your use of NextSplit is also governed by our <Link href="/privacy" className="text-[var(--ns-ember)] hover:underline">Privacy Policy</Link>. You own your training data. We do not sell it. You can export or delete it at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Intellectual property</h2>
            <p>NextSplit's software, brand, and content are owned by NextSplit and protected by copyright. Coach-authored training plans remain the intellectual property of the coach. You may not redistribute or resell plans purchased from the marketplace.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, NextSplit is not liable for indirect, incidental, or consequential damages including injury, loss of data, or loss of earnings. Our total liability is limited to the amount you paid us in the 3 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Termination</h2>
            <p>You may delete your account at any time in Settings. We may suspend or terminate accounts that violate these terms. Upon termination, your data is deleted within 30 days per our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">12. Governing law</h2>
            <p>These terms are governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">13. Contact</h2>
            <p>Questions about these terms: <a href="mailto:legal@nextsplit.com" className="text-[var(--ns-ember)] hover:underline">legal@nextsplit.com</a></p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-100 flex gap-4 text-sm">
          <Link href="/privacy" className="text-[var(--ns-ember)] hover:underline">Privacy Policy</Link>
          <Link href="/" className="text-gray-400 hover:underline">Back to NextSplit</Link>
        </div>
      </div>
    </main>
  )
}
