import { useId } from 'react'
import type { PatternLayer } from '@/lib/types'

type ShirtArtworkProps = {
  layers: PatternLayer[]
  className?: string
  title?: string
}

const shirtPath = 'M70 24 99 9h42l29 15 39 18-22 44-22-10v139c-23 9-107 9-130 0V76L13 86-9 42Z'

export function ShirtArtwork({ layers, className, title = 'Patterned shirt' }: ShirtArtworkProps) {
  const uid = useId().replace(/:/g, '')

  return (
    <svg className={className} viewBox="-12 0 224 235" role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <clipPath id={`${uid}-shirt`}><path d={shirtPath} /></clipPath>
        {layers.map((layer, index) => (
          <PatternDefinition key={`${layer.element}-${index}`} id={`${uid}-${index}`} layer={layer} />
        ))}
      </defs>
      <g clipPath={`url(#${uid}-shirt)`}>
        <rect x="-12" width="224" height="235" fill={layers[0]?.colors[0] ?? '#e8dfc8'} />
        {layers.map((layer, index) => (
          <rect
            key={`${layer.element}-${index}`}
            x="-80"
            y="-80"
            width="360"
            height="390"
            fill={`url(#${uid}-${index})`}
            opacity={layer.opacity ?? 1}
            style={{ mixBlendMode: index === 0 ? 'normal' : 'multiply' }}
            transform={`rotate(${layer.rotation} 100 110)`}
          />
        ))}
      </g>
      <path d={shirtPath} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M72 24c2 23 54 23 57 0M99 9c0 15 9 23 21 23s21-8 21-23" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M34 76 42 59m123 17-7-17" stroke="currentColor" strokeWidth="1.5" opacity=".6" />
    </svg>
  )
}

function PatternDefinition({ id, layer }: { id: string; layer: PatternLayer }) {
  const [a, b] = layer.colors
  const s = 28 * layer.scale

  if (layer.element === 'stripe') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><rect width={s * 0.38} height={s} fill={b}/></pattern>
  if (layer.element === 'grid') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0H${s}M0 0V${s}`} stroke={b} strokeWidth={Math.max(3, s * .16)}/></pattern>
  if (layer.element === 'plaid') return <pattern id={id} width={s * 2} height={s * 2} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s * 2} fill={a}/><path d={`M0 ${s * .55}H${s * 2}M${s * .55} 0V${s * 2}`} stroke={b} strokeWidth={s * .7}/><path d={`M0 ${s * .55}H${s * 2}M${s * .55} 0V${s * 2}`} stroke="#f5e8c7" strokeWidth={s * .1}/></pattern>
  if (layer.element === 'diamond') return <pattern id={id} width={s * 1.7} height={s * 1.7} patternUnits="userSpaceOnUse"><rect width={s * 1.7} height={s * 1.7} fill="transparent"/><path d={`M${s * .85} 1 ${s * 1.65} ${s * .85} ${s * .85} ${s * 1.65} 1 ${s * .85}Z`} fill={a} stroke={b} strokeWidth={s * .17}/></pattern>
  if (layer.element === 'chevron' || layer.element === 'zigzag') return <pattern id={id} width={s * 2} height={s} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s} fill={a}/><path d={`M0 ${s * .8} ${s * .5} ${s * .2} ${s} ${s * .8} ${s * 1.5} ${s * .2} ${s * 2} ${s * .8}`} fill="none" stroke={b} strokeWidth={s * .25}/></pattern>
  if (layer.element === 'paisley') return <pattern id={id} width={s * 2} height={s * 2} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s * 2} fill={a}/><path d={`M${s * 1.25} ${s * .3}c${s * .1} ${s * .65}-${s * .55} ${s * .42}-${s * .7} ${s * .98}-${s * .13} ${s * .48} ${s * .9} ${s * .62} ${s * 1.1}-${s * .12} ${s * .22}-${s * .82}-${s * .24}-${s * 1.06}-${s * .4}-${s * .86}Z`} fill={b}/><circle cx={s * 1.2} cy={s * 1.15} r={s * .16} fill={a}/></pattern>
  return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0h${s * .5}v${s * .22}h${s * .22}v${s * .5}H${s * .5}V${s}H0V${s * .5}h${s * .22}V${s * .22}H0Z`} fill={b}/><path d={`M${s * .5} ${s * .5}H${s}V${s}h-${s * .5}v-${s * .22}h-${s * .22}v-${s * .5}h${s * .22}Z`} fill={b}/></pattern>
}
