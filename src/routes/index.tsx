import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { ShirtCard } from '@/components/ShirtCard'
import { patternElementCategories, patternElements, type PatternElement } from '@/lib/pattern-elements'
import { getLeaderboard, getMarketplace } from '@/server/marketplace.functions'

const PRICE_STEP = 500

const searchSchema = z.object({
  elements: z.array(z.enum(patternElements)).optional().catch(undefined),
  min: z.number().int().nonnegative().optional().catch(undefined),
  max: z.number().int().nonnegative().optional().catch(undefined),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  loader: () => Promise.all([getMarketplace(), getLeaderboard()]),
  component: Marketplace,
})

function elementLabel(element: PatternElement) {
  if (element === 'polkadot') return 'Polka dot'
  return element.charAt(0).toUpperCase() + element.slice(1)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function Marketplace() {
  const [shirts, leaderboard] = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const selectedElements = useMemo(() => [...new Set(search.elements ?? [])], [search.elements])
  const [priceFloor, priceCeiling] = useMemo(() => {
    if (!shirts.length) return [0, 0]
    const prices = shirts.map((shirt) => shirt.price ?? shirt.priceFloor)
    return [Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP, Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP]
  }, [shirts])
  const requestedMin = clamp(search.min ?? priceFloor, priceFloor, priceCeiling)
  const requestedMax = clamp(search.max ?? priceCeiling, priceFloor, priceCeiling)
  const minPrice = Math.min(requestedMin, requestedMax)
  const maxPrice = Math.max(requestedMin, requestedMax)
  const leader = leaderboard[0]
  const visible = useMemo(() => shirts.filter((shirt) => (
    (shirt.price ?? shirt.priceFloor) >= minPrice
    && (shirt.price ?? shirt.priceFloor) <= maxPrice
    && (!selectedElements.length || shirt.layers.some((layer) => selectedElements.includes(layer.element)))
  )), [shirts, selectedElements, minPrice, maxPrice])

  function updateSearch(elements: PatternElement[], min: number, max: number) {
    void navigate({
      search: {
        elements: elements.length ? elements : undefined,
        min: min === priceFloor ? undefined : min,
        max: max === priceCeiling ? undefined : max,
      },
      replace: true,
    })
  }

  function toggleElement(element: PatternElement) {
    const next = selectedElements.includes(element)
      ? selectedElements.filter((selected) => selected !== element)
      : [...selectedElements, element]
    updateSearch(next, minPrice, maxPrice)
  }

  function setMinimum(value: number) {
    if (!Number.isFinite(value)) return
    updateSearch(selectedElements, Math.min(clamp(Math.round(value), priceFloor, priceCeiling), maxPrice), maxPrice)
  }

  function setMaximum(value: number) {
    if (!Number.isFinite(value)) return
    updateSearch(selectedElements, minPrice, Math.max(clamp(Math.round(value), priceFloor, priceCeiling), minPrice))
  }

  function resetFilters() {
    updateSearch([], priceFloor, priceCeiling)
  }

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
          <div className="pattern-filters">
            <span>Pattern</span>
            <div className="filter-pills filter-pills-all"><button className={!selectedElements.length ? 'active' : ''} type="button" onClick={() => updateSearch([], minPrice, maxPrice)} aria-pressed={!selectedElements.length}>All patterns</button></div>
            <div className="filter-pill-groups">
              <div className="filter-pill-group"><span>Geometric</span><div className="filter-pills">{patternElementCategories.geometric.map((element) => <button className={selectedElements.includes(element) ? 'active' : ''} type="button" key={element} onClick={() => toggleElement(element)} aria-pressed={selectedElements.includes(element)}>{elementLabel(element)}</button>)}</div></div>
              <div className="filter-pill-group"><span>Classic textile</span><div className="filter-pills">{patternElementCategories.textile.map((element) => <button className={selectedElements.includes(element) ? 'active' : ''} type="button" key={element} onClick={() => toggleElement(element)} aria-pressed={selectedElements.includes(element)}>{elementLabel(element)}</button>)}</div></div>
            </div>
          </div>
          <div className="price-filter">
            <span>Price range <b>{minPrice.toLocaleString()}–{maxPrice.toLocaleString()} Bones</b></span>
            <div className="price-sliders">
              <label><span>Minimum</span><input type="range" min={priceFloor} max={priceCeiling} step={PRICE_STEP} value={minPrice} onChange={(event) => setMinimum(event.currentTarget.valueAsNumber)}/></label>
              <label><span>Maximum</span><input type="range" min={priceFloor} max={priceCeiling} step={PRICE_STEP} value={maxPrice} onChange={(event) => setMaximum(event.currentTarget.valueAsNumber)}/></label>
            </div>
            <div className="price-inputs">
              <label><span>Minimum Bones</span><input type="number" min={priceFloor} max={maxPrice} step={PRICE_STEP} value={minPrice} onChange={(event) => setMinimum(event.currentTarget.valueAsNumber)}/></label>
              <label><span>Maximum Bones</span><input type="number" min={minPrice} max={priceCeiling} step={PRICE_STEP} value={maxPrice} onChange={(event) => setMaximum(event.currentTarget.valueAsNumber)}/></label>
            </div>
          </div>
        </div>
        {visible.length ? <div className="shirt-grid">{visible.map((shirt, index) => <ShirtCard shirt={shirt} index={index} key={shirt.id}/>)}</div> : <div className="no-results"><span>0 / {shirts.length}</span><h3>No shirt satisfies these terms.</h3><button type="button" onClick={resetFilters}>Clear the parameters</button></div>}
      </section>

      <a className="market-leaderboard-link" href="/leaderboard" aria-label="View the full leaderboard">
        <section id="leaderboard" className="leaderboard">
          <div><p className="eyebrow">Permanent record</p><h2>Most complicated<br/>ever sold.</h2></div>
          <div className="leader-number">{leader?.complexityScore ?? '—'}</div>
          {leader
            ? <div><p>“{leader.name}”</p><strong>{leader.price.toLocaleString()} Bones</strong><span>{leader.layerCount} layers × {leader.elementCount} elements × {leader.colorCount} colors</span></div>
            : <div><p>Nothing has sold yet.</p><strong>The permanent record remains clear.</strong><span>0 layers × 0 elements × 0 colors</span></div>}
        </section>
      </a>
    </main>
  )
}
