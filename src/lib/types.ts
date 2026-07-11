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
  listingId: string | null
  name: string
  creator: string
  price: number
  favorites: number
  isFavorited: boolean
  isOwner: boolean
  availability: 'available' | 'sold' | 'development'
  listed: string
  status?: 'listed' | 'sold'
  layers: PatternLayer[]
}

export type AccountState =
  | { mode: 'development'; configured: false }
  | { mode: 'guest'; configured: true }
  | {
      mode: 'authenticated'
      configured: true
      userId: string
      email: string
      username: string
      initials: string
      balance: number
      emailVerified: boolean
      dailyRewardClaimed: boolean
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
