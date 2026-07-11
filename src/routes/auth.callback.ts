import { createFileRoute } from '@tanstack/react-router'
import { exchangeAuthCode } from '@/lib/supabase.server'
import { safeReturnPath } from '@/lib/action-contracts'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const safeRedirect = safeReturnPath(url.searchParams.get('next'))

        if (!code) return new Response('The sign-in link is incomplete.', { status: 400 })
        try {
          await exchangeAuthCode(code)
          return Response.redirect(new URL(safeRedirect, url.origin), 303)
        } catch {
          return new Response('The sign-in link is invalid or expired.', { status: 400 })
        }
      },
    },
  },
})
