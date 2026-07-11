import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getMarketplaceRepository } from '@/data/repository.server'
import { patternDefinitionSchema } from '@/lib/pattern'

const idempotencyKey = z.string().uuid()

export const getMarketplace = createServerFn({ method: 'GET' }).handler(async () => {
  return getMarketplaceRepository().getMarketplace()
})

export const getListingDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ shirtId: z.string().trim().min(1).max(100) }).strict())
  .handler(async ({ data }) => getMarketplaceRepository().getListingDetail(data.shirtId))

export const createShirt = createServerFn({ method: 'POST' })
  .validator(z.object({
    name: z.string().trim().min(1).max(80),
    pattern: patternDefinitionSchema,
    idempotencyKey,
  }).strict())
  .handler(async ({ data }) => ({ shirtId: await getMarketplaceRepository().createShirt(data) }))

export const createListing = createServerFn({ method: 'POST' })
  .validator(z.object({
    shirtId: z.string().uuid(),
    price: z.number().int().positive().max(2_000_000_000),
    idempotencyKey,
  }).strict())
  .handler(async ({ data }) => ({ listingId: await getMarketplaceRepository().createListing(data) }))

export const purchaseListing = createServerFn({ method: 'POST' })
  .validator(z.object({ listingId: z.string().uuid(), idempotencyKey }).strict())
  .handler(async ({ data }) => getMarketplaceRepository().purchaseListing(data))

export const setListingFavorite = createServerFn({ method: 'POST' })
  .validator(z.object({ listingId: z.string().uuid(), favorite: z.boolean() }).strict())
  .handler(async ({ data }) => getMarketplaceRepository().setFavorite(data))

export const claimDailyReward = createServerFn({ method: 'POST' })
  .validator(z.object({ idempotencyKey }).strict())
  .handler(async ({ data }) => getMarketplaceRepository().claimDailyReward(data.idempotencyKey))
