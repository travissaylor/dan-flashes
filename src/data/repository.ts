import type { PatternDefinition } from '@/lib/pattern'
import type { AccountState, PurchaseReceipt, Shirt } from '@/lib/types'

export type DailyRewardReceipt = {
  rewardDate: string
  amount: number
  balanceAfter: number
  alreadyClaimed: boolean
}

export interface MarketplaceRepository {
  getAccountState(): Promise<AccountState>
  getMarketplace(): Promise<Shirt[]>
  getListingDetail(shirtId: string): Promise<Shirt | null>
  createShirt(input: { name: string; pattern: PatternDefinition; idempotencyKey: string }): Promise<string>
  createListing(input: { shirtId: string; price: number; idempotencyKey: string }): Promise<string>
  purchaseListing(input: { listingId: string; idempotencyKey: string }): Promise<PurchaseReceipt>
  setFavorite(input: { listingId: string; favorite: boolean }): Promise<{ favorited: boolean; favoriteCount: number }>
  claimDailyReward(idempotencyKey: string): Promise<DailyRewardReceipt>
}

export class RepositoryError extends Error {
  constructor(message: string, readonly code = 'REPOSITORY_ERROR') {
    super(message)
    this.name = 'RepositoryError'
  }
}
