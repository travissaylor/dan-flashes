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
  const element = layer.element

  if (element === 'stripe') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><rect width={s * 0.38} height={s} fill={b}/></pattern>
  if (element === 'grid') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0H${s}M0 0V${s}`} stroke={b} strokeWidth={Math.max(3, s * .16)}/></pattern>
  if (element === 'plaid') return <pattern id={id} width={s * 2} height={s * 2} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s * 2} fill={a}/><path d={`M0 ${s * .55}H${s * 2}M${s * .55} 0V${s * 2}`} stroke={b} strokeWidth={s * .7}/><path d={`M0 ${s * .55}H${s * 2}M${s * .55} 0V${s * 2}`} stroke="#f5e8c7" strokeWidth={s * .1}/></pattern>
  if (element === 'diamond') return <pattern id={id} width={s * 1.7} height={s * 1.7} patternUnits="userSpaceOnUse"><rect width={s * 1.7} height={s * 1.7} fill="transparent"/><path d={`M${s * .85} 1 ${s * 1.65} ${s * .85} ${s * .85} ${s * 1.65} 1 ${s * .85}Z`} fill={a} stroke={b} strokeWidth={s * .17}/></pattern>
  if (element === 'chevron') return <pattern id={id} width={s * 2} height={s} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s} fill={a}/><path d={`M0 0 ${s} ${s * .58} ${s * 2} 0V${s * .28}L${s} ${s * .86} 0 ${s * .28}Z`} fill={b}/></pattern>
  if (element === 'zigzag') return <pattern id={id} width={s * 2} height={s} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s} fill={a}/><path d={`M0 ${s * .8} ${s * .5} ${s * .2} ${s} ${s * .8} ${s * 1.5} ${s * .2} ${s * 2} ${s * .8}`} fill="none" stroke={b} strokeWidth={s * .1}/></pattern>
  if (element === 'paisley') return <pattern id={id} width={s * 2} height={s * 2} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s * 2} fill={a}/><path d={`M${s * 1.25} ${s * .3}c${s * .1} ${s * .65}-${s * .55} ${s * .42}-${s * .7} ${s * .98}-${s * .13} ${s * .48} ${s * .9} ${s * .62} ${s * 1.1}-${s * .12} ${s * .22}-${s * .82}-${s * .24}-${s * 1.06}-${s * .4}-${s * .86}Z`} fill={b}/><circle cx={s * 1.2} cy={s * 1.15} r={s * .16} fill={a}/></pattern>
  if (element === 'houndstooth') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0h${s * .5}v${s * .22}h${s * .22}v${s * .5}H${s * .5}V${s}H0V${s * .5}h${s * .22}V${s * .22}H0Z`} fill={b}/><path d={`M${s * .5} ${s * .5}H${s}V${s}h-${s * .5}v-${s * .22}h-${s * .22}v-${s * .5}h${s * .22}Z`} fill={b}/></pattern>
  if (element === 'checkerboard') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0h${s * .5}v${s * .5}H0ZM${s * .5} ${s * .5}H${s}V${s}H${s * .5}Z`} fill={b}/></pattern>
  if (element === 'polkadot') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><circle cx={s * .5} cy={s * .5} r={s * .24} fill={b}/></pattern>
  if (element === 'triangle') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 ${s} ${s * .5} 0 ${s} ${s}Z`} fill={b}/></pattern>
  if (element === 'hexagon') return <pattern id={id} width={s * 1.5} height={s * 1.3} patternUnits="userSpaceOnUse"><rect width={s * 1.5} height={s * 1.3} fill={a}/><path d={`M${s * .75} ${s * .12} ${s * 1.32} ${s * .4} ${s * 1.32} ${s * .9} ${s * .75} ${s * 1.18} ${s * .18} ${s * .9} ${s * .18} ${s * .4}Z`} fill={b}/></pattern>
  if (element === 'wave') return <pattern id={id} width={s * 2} height={s} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s} fill={a}/><path d={`M0 ${s * .5}C${s * .5} 0 ${s * 1.5} ${s} ${s * 2} ${s * .5}`} fill="none" stroke={b} strokeWidth={s * .13}/></pattern>
  if (element === 'crosshatch') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0 ${s} ${s}M${s} 0 0 ${s}`} stroke={b} strokeWidth={s * .08}/></pattern>
  if (element === 'lattice') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0 ${s} ${s}M${s} 0 0 ${s}`} stroke={b} strokeWidth={s * .26}/><path d={`M0 0 ${s} ${s}M${s} 0 0 ${s}`} stroke={a} strokeWidth={s * .08}/></pattern>
  if (element === 'argyle') return <pattern id={id} width={s * 2} height={s * 2} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s * 2} fill={a}/><path d={`M${s} 0 ${s * 1.78} ${s} ${s} ${s * 2} ${s * .22} ${s}Z`} fill={b}/><path d={`M0 ${s} ${s} 0 ${s * 2} ${s} ${s} ${s * 2}Z`} fill="none" stroke={b} strokeWidth={s * .08}/></pattern>
  if (element === 'gingham') return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><rect width={s} height={s} fill={a}/><path d={`M0 0h${s * .42}v${s}H0ZM0 0h${s}v${s * .42}H0Z`} fill={b} opacity=".55"/></pattern>
  if (element === 'herringbone') return <pattern id={id} width={s * 2} height={s * 2} patternUnits="userSpaceOnUse"><rect width={s * 2} height={s * 2} fill={a}/><path d={`M0 0h${s * .22}L${s} ${s * .78}V${s}h-${s * .22}L0 ${s * .22}ZM${s} 0h${s * .22}L${s * 2} ${s * .78}V${s}h-${s * .22}L${s} ${s * .22}ZM0 ${s * 1.78} ${s * .78} ${s}H${s}v${s * .22}L${s * .22} ${s * 2}H0ZM${s} ${s * 1.78} ${s * 1.78} ${s * 2}H${s * 2}v-${s * .22}L${s * 1.22} ${s}H${s}Z`} fill={b}/></pattern>

  return assertNever(element)
}

function assertNever(element: never): never {
  throw new Error(`Unsupported pattern element: ${element}`)
}
