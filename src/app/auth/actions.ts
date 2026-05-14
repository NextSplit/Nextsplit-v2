'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { config } from '@/lib/config'
import { CURRENT_TERMS_VERSION } from '@/lib/legal/terms-version'


function friendlyError(msg: string): string {
  if (msg.includes('already registered') || msg.includes('User already exists'))
    return 'An account with this email already exists. Try signing in instead.'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return 'Incorrect email or password. Please try again.'
  if (msg.includes('Email not confirmed'))
    return 'Please check your email and confirm your account first.'
  if (msg.includes('Password should be'))
    return 'Password must be at least 8 characters.'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many attempts — please wait a minute and try again.'
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Connection error — please check your internet and try again.'
  return msg
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: friendlyError(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // K33 — hard-gate sign-up on the two mandatory consents.
  // The client also disables the submit button when either is
  // unchecked, but a server-side check is the authoritative record.
  const acceptTerms = formData.get('accept_terms') === 'on'
  const confirmAge  = formData.get('confirm_age')  === 'on'
  if (!acceptTerms || !confirmAge) {
    return { error: 'You must confirm you are 16 or older and accept the Terms and Privacy Policy before creating an account.' }
  }

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
      }
    }
  }

  const { data: result, error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: friendlyError(error.message) }
  }

  // Persist the consent moment on the profile. Supabase auth triggers
  // create the profile row; we update it with the consent metadata.
  // If the trigger races, the upsert pattern in onboarding will
  // backfill these on first profile write.
  const userId = result.user?.id
  if (userId) {
    const now = new Date().toISOString()
    const hdr = await headers()
    const ip  = hdr.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const ua  = hdr.get('user-agent') ?? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('profiles')
      .upsert({
        id:                  userId,
        terms_accepted_at:   now,
        terms_version:       CURRENT_TERMS_VERSION,
        age_confirmed_at:    now,
      }, { onConflict: 'id' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('account_lifecycle_events')
      .insert({
        user_id:    userId,
        event_type: 'terms_accepted',
        ip_address: ip,
        user_agent: ua,
        metadata:   { terms_version: CURRENT_TERMS_VERSION, via: 'signup' },
      })
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // PostHog identity is reset client-side in SettingsClient on signout
  redirect('/')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${config.siteUrl}/auth/callback`,
    },
  })

  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}
