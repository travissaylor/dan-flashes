import '@tanstack/react-start/server-only'
import { shirts } from './shirts'
import { RepositoryError, type MarketplaceRepository } from './repository'

const unavailable = () => {
  throw new RepositoryError(
    'This operation needs a configured Supabase project. Public browsing is using the development catalog.',
    'SUPABASE_NOT_CONFIGURED',
  )
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
  createShirt: unavailable,
  createListing: unavailable,
  purchaseListing: unavailable,
  setFavorite: unavailable,
  claimDailyReward: unavailable,
}
