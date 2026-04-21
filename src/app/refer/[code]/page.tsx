import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ code: string }>
}

/**
 * /refer/[code] — Referral landing page.
 * Stores the referral code in the URL and redirects to auth with it as a param.
 * The auth flow picks it up and calls POST /api/referral after signup.
 */
export default async function ReferralLandingPage({ params }: Props) {
  const { code } = await params

  // Redirect to signup with referral code embedded
  // Auth page reads ?ref= param after signup and calls /api/referral
  redirect(`/auth?ref=${encodeURIComponent(code.toUpperCase())}&mode=signup`)
}

export function generateMetadata() {
  return {
    title: 'Join NextSplit — Your first month free',
    description: 'A friend invited you to NextSplit. The training app that adapts when life gets in the way. Sign up and get your first month free.',
    openGraph: {
      title: 'Join NextSplit — Your first month free',
      description: 'The training plan that keeps up with your life. Invited by a friend — first month free.',
    },
  }
}
