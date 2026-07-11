import '@tanstack/react-start/server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import { RepositoryError } from '@/data/repository'

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null
}

export function createSupabaseServerClient() {
  const config = getSupabaseConfig()
  if (!config) {
    throw new RepositoryError('Supabase is not configured.', 'SUPABASE_NOT_CONFIGURED')
  }

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          setCookie(name, value, options as CookieOptions)
        }
      },
    },
  })
}

export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new RepositoryError('Supabase service credentials are not configured.', 'SUPABASE_ADMIN_NOT_CONFIGURED')
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function getCurrentUser() {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

export async function getVerifiedUser() {
  const user = await getCurrentUser()
  return user?.email_confirmed_at ? user : null
}

export async function requireVerifiedUser() {
  const user = await getCurrentUser()
  if (!user) throw new RepositoryError('Sign in to continue.', 'UNAUTHENTICATED')
  if (!user.email_confirmed_at) throw new RepositoryError('Email not confirmed.', 'EMAIL_NOT_VERIFIED')
  return user
}

export async function exchangeAuthCode(code: string) {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw new RepositoryError('The sign-in link is invalid or expired.', 'AUTH_CODE_EXCHANGE_FAILED')
}
