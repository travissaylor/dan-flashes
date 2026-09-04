import { describe, expect, it } from 'vitest'
import { describeShirtPrice } from './pricing'

describe('shirt price descriptions', () => {
  it('describes an available listing as purchasable', () => {
    expect(describeShirtPrice({ price: 2400, priceFloor: 1600, availability: 'available' })).toEqual({
      amount: 2400,
      label: 'Buy price',
      purchasable: true,
    })
  })

  it('describes a development listing as read-only', () => {
    expect(describeShirtPrice({ price: 2400, priceFloor: 1600, availability: 'development' })).toEqual({
      amount: 2400,
      label: 'Buy price',
      purchasable: false,
    })
  })

  it('describes an unlisted shirt by its minimum value', () => {
    expect(describeShirtPrice({ price: 2400, priceFloor: 1600, availability: 'unlisted' })).toEqual({
      amount: 1600,
      label: 'Minimum value',
      purchasable: false,
    })
  })

  it('falls back to minimum value when an available shirt has no listing price', () => {
    expect(describeShirtPrice({ price: null, priceFloor: 1600, availability: 'available' })).toEqual({
      amount: 1600,
      label: 'Minimum value',
      purchasable: false,
    })
  })
})
