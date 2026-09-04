import type { PatternElement } from './pattern-elements'

export type { PatternElement }

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
  owner: string
  price: number
  priceFloor: number
  complexityScore: number
  favorites: number
  isFavorited: boolean
  isOwner: boolean
  availability: 'available' | 'sold' | 'unlisted' | 'development'
  listed: string
  layers: PatternLayer[]
}

export type LeaderboardEntry = {
  rank: number
  listingId: string
  shirtId: string
  name: string
  layers: PatternLayer[]
  price: number
  soldAt: string
  seller: string
  buyer: string
  complexityScore: number
  layerCount: number
  elementCount: number
  colorCount: number
}

export type Profile = {
  username: string
  joinedAt: string
  shirtsOwned: number
  shirtsCreated: number
  salesCount: number
  owned: Shirt[]
  created: Shirt[]
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
