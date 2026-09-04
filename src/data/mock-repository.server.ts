import '@tanstack/react-start/server-only'
import type { LeaderboardEntry } from '@/lib/types'
import { shirts } from './shirts'
import { RepositoryError, type MarketplaceRepository } from './repository'

const unavailable = () => {
  throw new RepositoryError(
    'This operation needs a configured Supabase project. Public browsing is using the development catalog.',
    'SUPABASE_NOT_CONFIGURED',
  )
}

const JOINED_LABEL = 'Since Sep 2026'
const SETTLED_SALES = [
  { buyer: 'karl_havoc', soldAt: 'Yesterday' },
  { buyer: 'triple_denim', soldAt: '3 days ago' },
  { buyer: 'shirt_enjoyer', soldAt: 'Last week' },
]

function settledSales(): LeaderboardEntry[] {
  return [...shirts]
    .sort((a, b) => b.complexityScore - a.complexityScore || b.price - a.price || a.id.localeCompare(b.id))
    .slice(0, SETTLED_SALES.length)
    .map((shirt, index) => ({
      rank: index + 1,
      listingId: `development-listing-${shirt.id}`,
      shirtId: shirt.id,
      name: shirt.name,
      layers: structuredClone(shirt.layers),
      price: shirt.price,
      soldAt: SETTLED_SALES[index].soldAt,
      seller: shirt.creator,
      buyer: SETTLED_SALES[index].buyer,
      complexityScore: shirt.complexityScore,
      layerCount: shirt.layers.length,
      elementCount: new Set(shirt.layers.map((layer) => layer.element)).size,
      colorCount: new Set(shirt.layers.flatMap((layer) => layer.colors.map((color) => color.toLowerCase()))).size,
    }))
}

export const mockMarketplaceRepository: MarketplaceRepository = {
  async getAccountState() {
    return { mode: 'development' as const, configured: false as const }
  },
  async getMarketplace() {
    return structuredClone(shirts)
  },
  async getListingDetail(shirtId) {
    return structuredClone(shirts.find((shirt) => shirt.id === shirtId) ?? null)
  },
  async getProfile(username) {
    const owned = shirts.filter((shirt) => shirt.creator === username)
    if (!owned.length) return null
    const salesCount = settledSales().filter((entry) => entry.seller === username).length
    return {
      username,
      joinedAt: JOINED_LABEL,
      shirtsOwned: owned.length,
      shirtsCreated: owned.length,
      salesCount,
      owned: structuredClone(owned),
      created: structuredClone(owned),
    }
  },
  async getLeaderboard(limit) {
    return settledSales().slice(0, Math.max(0, limit))
  },
  createShirt: unavailable,
  createListing: unavailable,
  purchaseListing: unavailable,
  cancelListing: unavailable,
  setFavorite: unavailable,
  claimDailyReward: unavailable,
}
