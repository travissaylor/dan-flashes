import { createFileRoute, notFound } from '@tanstack/react-router'
import { ShirtArtwork } from '@/components/ShirtArtwork'
import { ListingActions } from '@/components/ListingActions'
import { BASE_PRICE, formatBones, getComplexity } from '@/lib/complexity'
import { getAccountState, getListingDetail } from '@/server/marketplace.functions'

export const Route = createFileRoute('/shirts/$shirtId')({
  loader: async ({ params }) => {
    const [shirt, account] = await Promise.all([getListingDetail({ data: { shirtId: params.shirtId } }), getAccountState()])
    if (!shirt) throw notFound()
    return { shirt, account }
  },
  component: ShirtDetail,
})

function ShirtDetail() {
  const { shirt, account } = Route.useLoaderData()
  const complexity = getComplexity(shirt.layers)
  return (
    <main className="detail-page">
      <div className="detail-art"><span className="one-of-one">{shirt.availability === 'sold' ? 'Acquired. Permanently.' : shirt.availability === 'development' ? 'Development collection.' : 'One available. Ever.'}</span><ShirtArtwork layers={shirt.layers} title={shirt.name}/></div>
      <section className="detail-copy">
        <p className="eyebrow">Authenticated Dan Flashes original</p>
        <h1>{shirt.name}</h1>
        <p className="creator">Created by <a href="#creator">@{shirt.creator}</a> · {shirt.favorites} admirers</p>
        <div className="price-lockup"><strong>{formatBones(shirt.price)}</strong><span>Bones<br/>Buy price</span></div>
        <ListingActions shirt={shirt} account={account}/>
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
