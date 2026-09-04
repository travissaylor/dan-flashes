import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import type { Provider } from '@supabase/supabase-js'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase.server'
import { authInputSchema, mapActionError, safeReturnPath, signUpInputSchema, type ActionResult } from '@/lib/action-contracts'

export const ALLOWED_OAUTH_PROVIDERS = [
  'google',
  'github',
  'apple',
  'discord',
  'twitch',
  'facebook',
  'azure',
  'gitlab',
  'bitbucket',
  'linkedin_oidc',
  'notion',
  'slack_oidc',
  'spotify',
  'twitter',
  'zoom',
] as const

export type AllowedOAuthProvider = (typeof ALLOWED_OAUTH_PROVIDERS)[number]

const ALLOWED_OAUTH_PROVIDER_SET: ReadonlySet<string> = new Set(ALLOWED_OAUTH_PROVIDERS)

export function getConfiguredOAuthProviders(): AllowedOAuthProvider[] {
  const raw = process.env.AUTH_OAUTH_PROVIDERS
  if (!raw) return []
  const providers: AllowedOAuthProvider[] = []
  for (const item of raw.split(',')) {
    const trimmed = item.trim().toLowerCase()
    if (!/^[a-z0-9_]+$/.test(trimmed)) continue
    if (ALLOWED_OAUTH_PROVIDER_SET.has(trimmed)) {
      const provider = trimmed as AllowedOAuthProvider
      if (!providers.includes(provider)) {
        providers.push(provider)
      }
    }
  }
  return providers
}

export const startOAuthInputSchema = z.object({
  provider: z.string().trim().toLowerCase(),
  next: z.string().max(500).optional(),
}).strict()

export const signIn = createServerFn({ method: 'POST' })
  .validator(authInputSchema)
  .handler(async ({ data }): Promise<ActionResult<{ next: string }>> => {
    try {
      const supabase = createSupabaseServerClient()
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      if (error) throw error
      return { ok: true, data: { next: safeReturnPath(data.next) } }
    } catch (error) {
      return { ok: false, error: mapActionError(error) }
    }
  })

export const signUp = createServerFn({ method: 'POST' })
  .validator(signUpInputSchema)
  .handler(async ({ data }): Promise<ActionResult<{ verificationRequired: boolean; next: string }>> => {
    try {
      const next = safeReturnPath(data.next)
      const origin = new URL(getRequest().url).origin
      const callback = new URL('/auth/callback', origin)
      callback.searchParams.set('next', next)
      const supabase = createSupabaseServerClient()
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { username: data.username }, emailRedirectTo: callback.toString() },
      })
      if (error) throw error
      return { ok: true, data: { verificationRequired: !authData.session, next } }
    } catch (error) {
      return { ok: false, error: mapActionError(error) }
    }
  })

export const signOut = createServerFn({ method: 'POST' })
  .handler(async (): Promise<ActionResult<null>> => {
    try {
      const supabase = createSupabaseServerClient()
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      return { ok: true, data: null }
    } catch (error) {
      return { ok: false, error: mapActionError(error) }
    }
  })

export const startOAuth = createServerFn({ method: 'POST' })
  .validator(startOAuthInputSchema)
  .handler(async ({ data }): Promise<ActionResult<{ url: string }>> => {
    try {
      const configured = getConfiguredOAuthProviders()
      const validated = z.object({
        provider: z.string().trim().toLowerCase().refine(
          (provider): provider is AllowedOAuthProvider => configured.includes(provider as AllowedOAuthProvider),
          { message: 'Authentication provider is not configured.' },
        ),
        next: z.string().max(500).optional(),
      }).strict().parse(data)

      const next = safeReturnPath(validated.next)
      const origin = new URL(getRequest().url).origin
      const callback = new URL('/auth/callback', origin)
      callback.searchParams.set('next', next)
      const supabase = createSupabaseServerClient()
      const { data: authData, error } = await supabase.auth.signInWithOAuth({
        provider: validated.provider as Provider,
        options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!authData?.url) throw new Error('OAuth provider did not return a redirection URL.')
      return { ok: true, data: { url: authData.url } }
    } catch (error) {
      return { ok: false, error: mapActionError(error) }
    }
  })

export const getAuthAvailability = createServerFn({ method: 'GET' }).handler(() => ({
  configured: isSupabaseConfigured(),
  providers: getConfiguredOAuthProviders(),
}))
