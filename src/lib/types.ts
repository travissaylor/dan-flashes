export type PatternElement =
  | 'houndstooth'
  | 'paisley'
  | 'diamond'
  | 'chevron'
  | 'plaid'
  | 'grid'
  | 'zigzag'
  | 'stripe'

export type PatternLayer = {
  element: PatternElement
  colors: [string, string]
  scale: number
  rotation: number
  opacity?: number
}

export type Shirt = {
  id: string
  name: string
  creator: string
  price: number
  favorites: number
  listed: string
  status?: 'listed' | 'sold'
  layers: PatternLayer[]
}

export type MarketplaceQuery = {
  element?: PatternElement
  maxPrice?: number
}

export type PurchaseReceipt = {
  listingId: string
  shirtId: string
  buyerBalance: number
  sellerProceeds: number
  houseCut: number
}
