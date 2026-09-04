import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { ShirtArtwork } from '@/components/ShirtArtwork'
import { ListingActions } from '@/components/ListingActions'
import { BASE_PRICE, formatBones, getComplexity } from '@/lib/complexity'
import { getAccountState, getListingDetail } from '@/server/marketplace.functions'

// The request origin is only available on the server. Client-side navigations
// fall back to a relative image path instead of round-tripping for it.
const getRequestOrigin = createServerFn({ method: 'GET' }).handler(() => {
  try {
    return new URL(getRequest().url).origin
  } catch {
    return null
  }
})

export const Route = createFileRoute('/shirts/$shirtId')({
  loader: async ({ params }) => {
    const [shirt, account] = await Promise.all([getListingDetail({ data: { shirtId: params.shirtId } }), getAccountState()])
    if (!shirt) throw notFound()
    const imagePath = `/shirts/${shirt.id}/image.png`
    const origin = typeof document === 'undefined' ? await getRequestOrigin() : null
    return { shirt, account, ogImageUrl: origin ? `${origin}${imagePath}` : imagePath }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { shirt, ogImageUrl } = loaderData
    const complexity = getComplexity(shirt.layers)
    const title = `${shirt.name} · Dan Flashes`
    const description = `By @${shirt.creator} · ${formatBones(shirt.price)} Bones · ${complexity.layers} layers × ${complexity.elements} elements × ${complexity.colors} colors.`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: ogImageUrl },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: ogImageUrl },
      ],
    }
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
        <p className="creator">Created by <a href={`/profiles/${shirt.creator}`}>@{shirt.creator}</a> · {shirt.favorites} admirers</p>
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
