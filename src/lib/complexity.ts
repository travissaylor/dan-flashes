import type { PatternLayer } from './types'

export const BASE_PRICE = 50

export function getComplexity(layers: PatternLayer[]) {
  const elements = new Set(layers.map((layer) => layer.element)).size
  const colors = new Set(layers.flatMap((layer) => layer.colors)).size
  const score = layers.length * elements * colors

  return { layers: layers.length, elements, colors, score, floor: score * BASE_PRICE }
}

export function formatBones(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}
