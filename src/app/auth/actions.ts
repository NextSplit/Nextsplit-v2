'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { config } from '@/lib/config'


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
  redirect('/today')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: friendlyError(error.message) }
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
