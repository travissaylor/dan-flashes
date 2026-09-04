import { createFileRoute, Link } from '@tanstack/react-router'
import { ShirtArtwork } from '@/components/ShirtArtwork'
import { formatBones } from '@/lib/complexity'
import { getLeaderboard } from '@/server/marketplace.functions'

export const Route = createFileRoute('/leaderboard')({
  loader: () => getLeaderboard(),
  head: () => ({
    meta: [
      { title: 'Permanent record · Dan Flashes' },
      { name: 'description', content: 'The most complicated shirts ever sold at Dan Flashes. Permanent record.' },
    ],
  }),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const entries = Route.useLoaderData()

  if (!entries || entries.length === 0) {
    return (
      <main className="leaderboard-page">
        <section className="leaderboard-empty">
          <p className="eyebrow">Permanent record</p>
          <h1>Nothing has sold. Everyone is still deciding.</h1>
          <p className="leaderboard-empty-note">
            The racks are full, but no one has pulled the trigger yet. When the first piece trades hands, it will be recorded here forever.
          </p>
          <Link to="/" className="leaderboard-empty-link">Return to the floor</Link>
        </section>
      </main>
    )
  }

  const [champion, ...rest] = entries

  return (
    <main className="leaderboard-page">
      <section id="leaderboard" className="leaderboard" aria-labelledby="leaderboard-champion-title">
        <div>
          <p className="eyebrow">Permanent record № 01</p>
          <h1 id="leaderboard-champion-title">Most complicated<br />ever sold.</h1>
        </div>
        <div className="leader-number">{champion.complexityScore}</div>
        <div>
          <p>
            <Link to="/shirts/$shirtId" params={{ shirtId: champion.shirtId }}>
              “{champion.name}”
            </Link>
          </p>
          <strong>{formatBones(champion.price)} Bones</strong>
          <span>{champion.layerCount} layers × {champion.elementCount} elements × {champion.colorCount} colors</span>
          <span className="leader-parties">
            <a href={`/profiles/${champion.seller}`}>@{champion.seller}</a>
            <span aria-hidden="true"> → </span>
            <a href={`/profiles/${champion.buyer}`}>@{champion.buyer}</a>
            {' · '}
            {champion.soldAt}
          </span>
        </div>
      </section>

      {rest.length > 0 && (
        <section className="leaderboard-table-section" aria-labelledby="leaderboard-contenders-title">
          <div className="leaderboard-table-header">
            <div>
              <p className="eyebrow">The rest of the record</p>
              <h2 id="leaderboard-contenders-title">Ranked acquisitions</h2>
            </div>
            <span className="leaderboard-count">{rest.length} {rest.length === 1 ? 'acquisition' : 'acquisitions'}</span>
          </div>
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th scope="col" className="col-rank">Rank</th>
                  <th scope="col" className="col-thumb">Piece</th>
                  <th scope="col" className="col-name">Pattern</th>
                  <th scope="col" className="col-complexity">Complexity</th>
                  <th scope="col" className="col-price">Price</th>
                  <th scope="col" className="col-parties">Seller → Buyer</th>
                  <th scope="col" className="col-sold-at">Sold</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((entry) => (
                  <tr key={entry.listingId || entry.shirtId} className="leaderboard-row">
                    <td className="col-rank">
                      <span className="leaderboard-rank">№ {entry.rank}</span>
                    </td>
                    <td className="col-thumb">
                      <Link
                        to="/shirts/$shirtId"
                        params={{ shirtId: entry.shirtId }}
                        className="leaderboard-thumb-link"
                        aria-label={`View ${entry.name}`}
                      >
                        <div className="leaderboard-thumb-box">
                          <ShirtArtwork layers={entry.layers} title={entry.name} />
                        </div>
                      </Link>
                    </td>
                    <td className="col-name">
                      <div className="leaderboard-name-block">
                        <Link
                          to="/shirts/$shirtId"
                          params={{ shirtId: entry.shirtId }}
                          className="leaderboard-shirt-title"
                        >
                          {entry.name}
                        </Link>
                        <span className="leaderboard-spec">
                          {entry.layerCount} layers × {entry.elementCount} elements × {entry.colorCount} colors
                        </span>
                      </div>
                    </td>
                    <td className="col-complexity">
                      <span className="leaderboard-score-value">{entry.complexityScore}</span>
                    </td>
                    <td className="col-price">
                      <span className="leaderboard-price-value">
                        <strong>{formatBones(entry.price)}</strong> <small>Bones</small>
                      </span>
                    </td>
                    <td className="col-parties">
                      <div className="leaderboard-exchange">
                        <a href={`/profiles/${entry.seller}`} className="leaderboard-profile-link">
                          @{entry.seller}
                        </a>
                        <span className="leaderboard-exchange-arrow" aria-hidden="true">→</span>
                        <a href={`/profiles/${entry.buyer}`} className="leaderboard-profile-link">
                          @{entry.buyer}
                        </a>
                      </div>
                    </td>
                    <td className="col-sold-at">
                      <span className="leaderboard-sold-label">{entry.soldAt}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
