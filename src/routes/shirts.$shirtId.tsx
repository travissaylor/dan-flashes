import { createFileRoute, notFound } from '@tanstack/react-router'
import { ShirtArtwork } from '@/components/ShirtArtwork'
import { shirts } from '@/data/shirts'
import { BASE_PRICE, formatBones, getComplexity } from '@/lib/complexity'

export const Route = createFileRoute('/shirts/$shirtId')({
  loader: ({ params }) => {
    const shirt = shirts.find((item) => item.id === params.shirtId)
    if (!shirt) throw notFound()
    return shirt
  },
  component: ShirtDetail,
})

function ShirtDetail() {
  const shirt = Route.useLoaderData()
  const complexity = getComplexity(shirt.layers)
  return (
    <main className="detail-page">
      <div className="detail-art"><span className="one-of-one">One available. Ever.</span><ShirtArtwork layers={shirt.layers} title={shirt.name}/></div>
      <section className="detail-copy">
        <p className="eyebrow">Authenticated Dan Flashes original</p>
        <h1>{shirt.name}</h1>
        <p className="creator">Created by <a href="#creator">@{shirt.creator}</a> · {shirt.favorites} admirers</p>
        <div className="price-lockup"><strong>{formatBones(shirt.price)}</strong><span>Bones<br/>Buy price</span></div>
        <button className="buy-button" type="button">Acquire this shirt <span>→</span></button>
        <p className="purchase-note">Ownership transfers immediately. No returns. There is only one.</p>
        <div className="complexity-receipt">
          <div><h2>Why it costs that</h2><span>Verified calculation</span></div>
          <p><b>{complexity.layers}</b> layers <i>×</i> <b>{complexity.elements}</b> elements <i>×</i> <b>{complexity.colors}</b> colors</p>
          <p><span>Complexity score</span><strong>{complexity.score}</strong></p>
          <p><span>Minimum value</span><strong>{formatBones(complexity.score)} × {BASE_PRICE} = {formatBones(complexity.floor)} B</strong></p>
        </div>
      </section>
    </main>
  )
}
