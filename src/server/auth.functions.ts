import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase.server'
import { authInputSchema, mapActionError, safeReturnPath, signUpInputSchema, type ActionResult } from '@/lib/action-contracts'

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

export const getAuthAvailability = createServerFn({ method: 'GET' }).handler(() => ({ configured: isSupabaseConfigured() }))
