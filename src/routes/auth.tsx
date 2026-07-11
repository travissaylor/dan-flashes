import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { safeReturnPath } from '@/lib/action-contracts'
import { getAuthAvailability, signIn, signUp } from '@/server/auth.functions'

const searchSchema = z.object({ next: z.string().optional().catch('/') })

export const Route = createFileRoute('/auth')({
  validateSearch: searchSchema,
  loader: () => getAuthAvailability(),
  component: AuthPage,
})

function AuthPage() {
  const { configured } = Route.useLoaderData()
  const { next } = Route.useSearch()
  const returnPath = safeReturnPath(next)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !configured) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'signin') {
        const result = await signIn({ data: { email: String(form.get('email')), password: String(form.get('password')), next: returnPath } })
        if (!result.ok) return setError(result.error.message)
        window.location.assign(result.data.next)
        return
      }
      const result = await signUp({ data: {
        email: String(form.get('email')), password: String(form.get('password')),
        username: String(form.get('username')), next: returnPath,
      } })
      if (!result.ok) return setError(result.error.message)
      if (result.data.verificationRequired) {
        setSuccess('Check your email. The verification link establishes your account and releases the signup Bones.')
      } else {
        window.location.assign(result.data.next)
      }
    } catch {
      setError('Authentication did not settle. Your entries remain in place.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-editorial">
        <p className="eyebrow">Client services</p>
        <h1>Establish<br/><em>your account.</em></h1>
        <p>Verified clients receive 2,000 Bones. This is enough to begin making decisions.</p>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-tabs" role="tablist" aria-label="Account action">
          <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(''); setSuccess('') }}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Open account</button>
        </div>
        <h2 id="auth-title">{mode === 'signin' ? 'Return to the floor.' : 'Enter the pattern economy.'}</h2>
        {!configured ? <div className="form-notice">Authentication is intentionally unavailable in the development catalog. Configure Supabase to open accounts.</div> : (
          <form onSubmit={submit}>
            {mode === 'signup' && <label><span>Public username</span><input name="username" required minLength={3} maxLength={15} pattern="[A-Za-z0-9_]+" autoComplete="username" aria-describedby="username-hint"/><small id="username-hint">3–15 letters, numbers, or underscores. A short account mark is added for uniqueness.</small></label>}
            <label><span>Email</span><input name="email" type="email" required maxLength={254} autoComplete="email"/></label>
            <label><span>Password</span><input name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}/></label>
            <button className="auth-submit" type="submit" disabled={pending}>{pending ? 'Authenticating…' : mode === 'signin' ? 'Sign in' : 'Create account'} <span>→</span></button>
          </form>
        )}
        <div className={`form-status ${error ? 'is-error' : ''}`} role="status" aria-live="polite">{error || success}</div>
        <p className="auth-fineprint">Email verification is not ceremonial. The signup allowance is issued only after confirmation.</p>
      </section>
    </main>
  )
}
