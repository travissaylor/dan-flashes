import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ShirtArtwork } from '@/components/ShirtArtwork'
import { BASE_PRICE, formatBones, getComplexity } from '@/lib/complexity'
import type { PatternElement, PatternLayer } from '@/lib/types'

export const Route = createFileRoute('/designer')({ component: Designer })

const elements: PatternElement[] = ['houndstooth', 'paisley', 'diamond', 'chevron', 'plaid', 'grid', 'zigzag', 'stripe']
const palette = ['#d8ff36', '#ef5b38', '#1b365d', '#e7a9bc', '#f4e7c4', '#264b3f', '#e6c86a', '#59291f']
const starter: PatternLayer[] = [{ element: 'houndstooth', colors: ['#f4e7c4', '#17231f'], scale: .85, rotation: 0 }]

function Designer() {
  const [layers, setLayers] = useState(starter)
  const [selected, setSelected] = useState(0)
  const active = layers[selected]
  const complexity = getComplexity(layers)
  const update = (patch: Partial<PatternLayer>) => setLayers((current) => current.map((layer, index) => index === selected ? { ...layer, ...patch } : layer))
  const addLayer = (element: PatternElement) => { if (layers.length >= 6) return; setLayers((current) => [...current, { element, colors: [palette[(current.length * 2) % palette.length], palette[(current.length * 2 + 3) % palette.length]], scale: 1, rotation: 0, opacity: .76 }]); setSelected(layers.length) }

  return (
    <main className="designer-page">
      <section className="designer-intro"><p className="eyebrow">Pattern laboratory</p><h1>Make it<br/><em>complicated.</em></h1><p>Every decision adds value. Exercise restraint only if you cannot afford the alternative.</p></section>
      <section className="designer-canvas"><ShirtArtwork layers={layers} title="Your custom pattern"/><span>Live structured SVG preview</span></section>
      <aside className="designer-controls">
        <div className="control-header"><span>Composition</span><b>{layers.length} / 6 layers</b></div>
        <div className="layer-list">{layers.map((layer, index) => <button type="button" className={selected === index ? 'active' : ''} key={`${layer.element}-${index}`} onClick={() => setSelected(index)}><i>{index + 1}</i><span>{layer.element}</span><b>•••</b></button>)}</div>
        <label className="control-label"><span>Element</span><select value={active.element} onChange={(event) => update({ element: event.target.value as PatternElement })}>{elements.map((element) => <option key={element}>{element}</option>)}</select></label>
        <div className="color-controls"><span>Thread colors</span>{active.colors.map((color, index) => <label key={index} style={{ background: color }}><input aria-label={`Color ${index + 1}`} type="color" value={color} onChange={(event) => { const colors = [...active.colors] as [string, string]; colors[index] = event.target.value; update({ colors }) }}/></label>)}</div>
        <label className="range-control"><span>Scale <b>{active.scale.toFixed(2)}×</b></span><input type="range" min=".4" max="1.8" step=".05" value={active.scale} onChange={(event) => update({ scale: Number(event.target.value) })}/></label>
        <label className="range-control"><span>Rotation <b>{active.rotation}°</b></span><input type="range" min="-45" max="45" value={active.rotation} onChange={(event) => update({ rotation: Number(event.target.value) })}/></label>
        <div className="add-pattern"><span>Add a layer</span><div>{elements.filter((element) => !layers.some((layer) => layer.element === element)).slice(0, 4).map((element) => <button type="button" key={element} onClick={() => addLayer(element)}>+ {element}</button>)}</div></div>
        {layers.length > 1 && <button className="remove-layer" type="button" onClick={() => { setLayers((current) => current.filter((_, index) => index !== selected)); setSelected(0) }}>Remove selected layer</button>}
      </aside>
      <section className="designer-price"><div><span>Complexity</span><strong>{complexity.layers} × {complexity.elements} × {complexity.colors} = {complexity.score}</strong></div><div><span>Minimum listing price</span><strong>{formatBones(complexity.floor)} Bones</strong><small>{complexity.score} × {BASE_PRICE}</small></div><button type="button">Save this shirt <span>→</span></button></section>
    </main>
  )
}
