import { Link } from '@tanstack/react-router'

export function SiteHeader() {
  return (
    <>
      <div className="announcement">Daily allowance ready. <button type="button">Collect 250 Bones</button></div>
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="Dan Flashes home">
          <span>Dan</span><span>Flashes</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/" activeOptions={{ exact: true }}>Marketplace</Link>
          <Link to="/designer">Design a shirt</Link>
          <a href="#leaderboard">Leaderboard</a>
        </nav>
        <div className="account-cluster">
          <span className="bones-balance"><i /> 18,450 <small>Bones</small></span>
          <button className="avatar" type="button" aria-label="Open account menu">TS</button>
        </div>
      </header>
    </>
  )
}
