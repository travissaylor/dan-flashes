import { createServerFn } from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { getMarketplaceRepository } from '@/data/repository.server'
import {
  cancelListingInputSchema, createListingInputSchema, createShirtInputSchema, dailyRewardInputSchema,
  favoriteInputSchema, mapActionError, profileLookupSchema, purchaseListingInputSchema, type ActionResult,
} from '@/lib/action-contracts'

const LEADERBOARD_LIMIT = 25

function markViewerDataPrivate() {
  setResponseHeaders(new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' }))
}

export const getMarketplace = createServerFn({ method: 'GET' }).handler(async () => {
  markViewerDataPrivate()
  return getMarketplaceRepository().getMarketplace()
})

export const getAccountState = createServerFn({ method: 'GET' }).handler(async () => {
  markViewerDataPrivate()
  return getMarketplaceRepository().getAccountState()
})

export const getListingDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ shirtId: z.string().trim().min(1).max(100) }).strict())
  .handler(async ({ data }) => {
    markViewerDataPrivate()
    return getMarketplaceRepository().getListingDetail(data.shirtId)
  })

export const getProfile = createServerFn({ method: 'GET' })
  .validator(profileLookupSchema)
  .handler(async ({ data }) => {
    markViewerDataPrivate()
    return getMarketplaceRepository().getProfile(data.username)
  })

export const getLeaderboard = createServerFn({ method: 'GET' }).handler(async () => {
  markViewerDataPrivate()
  return getMarketplaceRepository().getLeaderboard(LEADERBOARD_LIMIT)
})

export const createShirt = createServerFn({ method: 'POST' })
  .validator(createShirtInputSchema)
  .handler(async ({ data }): Promise<ActionResult<{ shirtId: string }>> => {
    try { return { ok: true, data: { shirtId: await getMarketplaceRepository().createShirt(data) } } }
    catch (error) { return { ok: false, error: mapActionError(error) } }
  })

export const createListing = createServerFn({ method: 'POST' })
  .validator(createListingInputSchema)
  .handler(async ({ data }): Promise<ActionResult<{ listingId: string }>> => {
    try { return { ok: true, data: { listingId: await getMarketplaceRepository().createListing(data) } } }
    catch (error) { return { ok: false, error: mapActionError(error) } }
  })

export const purchaseListing = createServerFn({ method: 'POST' })
  .validator(purchaseListingInputSchema)
  .handler(async ({ data }) => {
    try { return { ok: true as const, data: await getMarketplaceRepository().purchaseListing(data) } }
    catch (error) { return { ok: false as const, error: mapActionError(error) } }
  })

export const cancelListing = createServerFn({ method: 'POST' })
  .validator(cancelListingInputSchema)
  .handler(async ({ data }): Promise<ActionResult<{ listingId: string }>> => {
    try { return { ok: true, data: await getMarketplaceRepository().cancelListing(data) } }
    catch (error) { return { ok: false, error: mapActionError(error) } }
  })

export const setListingFavorite = createServerFn({ method: 'POST' })
  .validator(favoriteInputSchema)
  .handler(async ({ data }) => {
    try { return { ok: true as const, data: await getMarketplaceRepository().setFavorite(data) } }
    catch (error) { return { ok: false as const, error: mapActionError(error) } }
  })

export const claimDailyReward = createServerFn({ method: 'POST' })
  .validator(dailyRewardInputSchema)
  .handler(async ({ data }) => {
    try { return { ok: true as const, data: await getMarketplaceRepository().claimDailyReward(data.idempotencyKey) } }
    catch (error) { return { ok: false as const, error: mapActionError(error) } }
  })
