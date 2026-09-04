import type { PatternDefinition } from '@/lib/pattern'
import type { AccountState, LeaderboardEntry, Profile, PurchaseReceipt, Shirt } from '@/lib/types'

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
  getProfile(username: string): Promise<Profile | null>
  getLeaderboard(limit: number): Promise<LeaderboardEntry[]>
  createShirt(input: { name: string; pattern: PatternDefinition; idempotencyKey: string }): Promise<string>
  createListing(input: { shirtId: string; price: number; idempotencyKey: string }): Promise<string>
  purchaseListing(input: { listingId: string; idempotencyKey: string }): Promise<PurchaseReceipt>
  cancelListing(input: { listingId: string }): Promise<{ listingId: string }>
  setFavorite(input: { listingId: string; favorite: boolean }): Promise<{ favorited: boolean; favoriteCount: number }>
  claimDailyReward(idempotencyKey: string): Promise<DailyRewardReceipt>
}

export class RepositoryError extends Error {
  constructor(message: string, readonly code = 'REPOSITORY_ERROR') {
    super(message)
    this.name = 'RepositoryError'
  }
}
