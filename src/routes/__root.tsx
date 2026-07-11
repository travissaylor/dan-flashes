import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { SiteHeader } from '@/components/SiteHeader'
import { getAccountState } from '@/server/marketplace.functions'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  loader: () => getAccountState(),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Dan Flashes — Complication Has Its Price' },
      { name: 'description', content: 'One-of-one shirts priced by pattern complexity. That is how it works here.' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: () => <main className="empty-page"><p>404</p><h1>This pattern does not exist.</h1><a href="/">Return to the floor</a></main>,
})

function RootComponent() {
  const account = Route.useLoaderData()
  return <><SiteHeader account={account} /><Outlet /><footer><span>Dan Flashes</span><p>The patterns are complicated because they have to be.</p><small>© 2026 Shops at the Creek</small></footer></>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>
}
