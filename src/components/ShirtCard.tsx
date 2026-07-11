import { Link } from '@tanstack/react-router'
import { getComplexity, formatBones } from '@/lib/complexity'
import type { Shirt } from '@/lib/types'
import { ShirtArtwork } from './ShirtArtwork'

export function ShirtCard({ shirt, index }: { shirt: Shirt; index: number }) {
  const complexity = getComplexity(shirt.layers)
  return (
    <article className="shirt-card" style={{ '--delay': `${index * 70}ms` } as React.CSSProperties}>
      <Link to="/shirts/$shirtId" params={{ shirtId: shirt.id }} className="shirt-image-wrap">
        <span className="one-of-one">1 / 1</span>
        <ShirtArtwork layers={shirt.layers} title={shirt.name} />
        <span className="view-piece">View piece <b>↗</b></span>
      </Link>
      <div className="shirt-meta">
        <div>
          <h3><Link to="/shirts/$shirtId" params={{ shirtId: shirt.id }}>{shirt.name}</Link></h3>
          <p>By @{shirt.creator} · {shirt.listed}</p>
        </div>
        <strong>{formatBones(shirt.price)} <small>B</small></strong>
      </div>
      <div className="complexity-line"><span>Complexity {complexity.score}</span><span>{shirt.favorites} ♥</span></div>
    </article>
  )
}
