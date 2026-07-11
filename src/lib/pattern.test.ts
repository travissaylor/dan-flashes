import { describe, expect, it } from 'vitest'
import { getPurchaseDistribution } from './economy'
import { validatePatternAndGetComplexity } from './pattern'

describe('pattern validation and complexity', () => {
  it('normalizes colors and calculates the authoritative floor', () => {
    const result = validatePatternAndGetComplexity({
      layers: [
        { element: 'grid', colors: ['#AABBCC', '#112233'], scale: 1, rotation: 0 },
        { element: 'stripe', colors: ['#aabbcc', '#445566'], scale: 0.5, rotation: -45, opacity: 0.5 },
      ],
    })

    expect(result.pattern.layers[0].colors[0]).toBe('#aabbcc')
    expect(result.complexity).toEqual({ layers: 2, elements: 2, colors: 3, score: 12, floor: 600 })
  })

  it.each([
    { layers: [] },
    { layers: [{ element: 'unknown', colors: ['#ffffff', '#000000'], scale: 1, rotation: 0 }] },
    { layers: [{ element: 'grid', colors: ['red', '#000000'], scale: 1, rotation: 0 }] },
    { layers: [{ element: 'grid', colors: ['#ffffff', '#000000'], scale: 2, rotation: 0 }] },
    { layers: [{ element: 'grid', colors: ['#ffffff', '#000000'], scale: 1, rotation: 46 }] },
  ])('rejects invalid structured pattern JSON', (pattern) => {
    expect(() => validatePatternAndGetComplexity(pattern)).toThrow()
  })
})

describe('economy invariants', () => {
  it('conserves the purchase price across seller proceeds and house cut', () => {
    const distribution = getPurchaseDistribution(9_401)
    expect(distribution).toEqual({ sellerProceeds: 8_273, houseCut: 1_128 })
    expect(distribution.sellerProceeds + distribution.houseCut).toBe(9_401)
  })

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects an invalid Bones amount', (price) => {
    expect(() => getPurchaseDistribution(price)).toThrow(RangeError)
  })
})
