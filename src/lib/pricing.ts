import type { Shirt } from './types'

type ShirtPriceDescription = {
  amount: number
  label: 'Buy price' | 'Minimum value'
  purchasable: boolean
}

export function describeShirtPrice(shirt: Pick<Shirt, 'price' | 'priceFloor' | 'availability'>): ShirtPriceDescription {
  if (shirt.availability === 'unlisted' || shirt.price === null) {
    return { amount: shirt.priceFloor, label: 'Minimum value', purchasable: false }
  }
  return { amount: shirt.price, label: 'Buy price', purchasable: shirt.availability === 'available' }
}
