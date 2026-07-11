import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ShirtCard } from '@/components/ShirtCard'
import type { PatternElement } from '@/lib/types'
import { getMarketplace } from '@/server/marketplace.functions'

export const Route = createFileRoute('/')({
  loader: () => getMarketplace(),
  component: Marketplace,
})

const filters: Array<{ label: string; value: PatternElement | 'all' }> = [
  { label: 'All patterns', value: 'all' }, { label: 'Paisley', value: 'paisley' },
  { label: 'Houndstooth', value: 'houndstooth' }, { label: 'Plaid', value: 'plaid' },
  { label: 'Geometric', value: 'diamond' },
]

function Marketplace() {
  const shirts = Route.useLoaderData()
  const [filter, setFilter] = useState<PatternElement | 'all'>('all')
  const [maxPrice, setMaxPrice] = useState(15000)
  const [showFilters, setShowFilters] = useState(false)
  const visible = useMemo(() => shirts.filter((shirt) => shirt.price <= maxPrice && (filter === 'all' || shirt.layers.some((layer) => layer.element === filter))), [filter, maxPrice])

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">One-of-one patterned shirts · Shops at the Creek</p>
        <h1>Complication<br/><em>has its price.</em></h1>
        <div className="hero-note"><span>Market principle № 01</span><p>The more complicated the pattern, the more it costs. That’s how it works here.</p></div>
        <div className="hero-star" aria-hidden="true">✦</div>
      </section>

      <section className="market" aria-labelledby="market-heading">
        <div className="market-heading">
          <div><p className="eyebrow">The current floor</p><h2 id="market-heading">Newly listed</h2></div>
          <div className="market-tools"><span>{visible.length} singular pieces</span><button type="button" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>Filters <b>{showFilters ? '−' : '+'}</b></button></div>
        </div>
        <div className={`filter-drawer ${showFilters ? 'is-open' : ''}`}>
          <div><span>Pattern</span><div className="filter-pills">{filters.map((item) => <button className={filter === item.value ? 'active' : ''} type="button" key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div></div>
          <label><span>Maximum price <b>{maxPrice.toLocaleString()} Bones</b></span><input type="range" min="3000" max="15000" step="500" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))}/></label>
        </div>
        {visible.length ? <div className="shirt-grid">{visible.map((shirt, index) => <ShirtCard shirt={shirt} index={index} key={shirt.id}/>)}</div> : <div className="no-results"><span>0 / 0</span><h3>No shirt is that simple.</h3><button type="button" onClick={() => { setFilter('all'); setMaxPrice(15000) }}>Clear the parameters</button></div>}
      </section>

      <section id="leaderboard" className="leaderboard">
        <div><p className="eyebrow">Permanent record</p><h2>Most complicated<br/>ever sold.</h2></div>
        <div className="leader-number">384</div>
        <div><p>“The Bone Collector”</p><strong>19,200 Bones</strong><span>4 layers × 8 elements × 12 colors</span></div>
      </section>
    </main>
  )
}
