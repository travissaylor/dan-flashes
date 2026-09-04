import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ShirtCard } from '@/components/ShirtCard'
import { formatBones } from '@/lib/complexity'
import { getAccountState, getProfile } from '@/server/marketplace.functions'

export const Route = createFileRoute('/profiles/$username')({
  loader: async ({ params }) => {
    const [profile, account] = await Promise.all([
      getProfile({ data: { username: params.username } }),
      getAccountState(),
    ])
    if (!profile) throw notFound()
    return { profile, account }
  },
  head: ({ loaderData }) => loaderData ? { meta: [{ title: `@${loaderData.profile.username} · Dan Flashes` }] } : {},
  component: ProfilePage,
})

function ProfilePage() {
  const { profile, account } = Route.useLoaderData()
  const isOwner = account.mode === 'authenticated' && account.username === profile.username

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <p className="eyebrow">Registered pattern authority</p>
          <h1 style={{ '--heading-chars': profile.username.length + 1 } as React.CSSProperties}>@{profile.username}</h1>
          <p className="profile-joined">{profile.joinedAt}</p>
        </div>
        {isOwner && <Link className="profile-design-link" to="/designer">Design another <span aria-hidden="true">↗</span></Link>}
      </header>

      <dl className="profile-stats">
        <div><dt>Shirts owned</dt><dd>{profile.shirtsOwned}</dd></div>
        <div><dt>Shirts created</dt><dd>{profile.shirtsCreated}</dd></div>
        <div><dt>Sales</dt><dd>{profile.salesCount}</dd></div>
        {isOwner && <div className="profile-balance"><dt>Bones balance</dt><dd>{formatBones(account.balance)}</dd></div>}
      </dl>

      <section className="profile-collection" aria-labelledby="owned-heading">
        <div className="profile-section-heading"><div><p className="eyebrow">Current custody</p><h2 id="owned-heading">Owned</h2></div><span>{profile.owned.length} singular pieces</span></div>
        {profile.owned.length ? <div className="shirt-grid">{profile.owned.map((shirt, index) => <ShirtCard shirt={shirt} index={index} key={shirt.id}/>)}</div> : <p className="profile-empty">No shirts. This is a choice.</p>}
      </section>

      <section className="profile-collection" aria-labelledby="created-heading">
        <div className="profile-section-heading"><div><p className="eyebrow">Permanent authorship</p><h2 id="created-heading">Created</h2></div><span>{profile.created.length} documented designs</span></div>
        {profile.created.length ? <div className="shirt-grid">{profile.created.map((shirt, index) => <ShirtCard shirt={shirt} index={index} key={shirt.id}/>)}</div> : <p className="profile-empty">No shirts. This is a choice.</p>}
      </section>
    </main>
  )
}
