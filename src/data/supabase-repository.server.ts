import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { patternDefinitionSchema } from '@/lib/pattern'
import { createSupabaseServerClient, getCurrentUser, requireVerifiedUser } from '@/lib/supabase.server'
import type { LeaderboardEntry, Shirt } from '@/lib/types'
import { RepositoryError, type MarketplaceRepository } from './repository'

const countSchema = z.coerce.number().int().nonnegative()
const bonesSchema = z.coerce.number().int().safe()

const collectionRowSchema = z.object({
  shirt_id: z.string().uuid(),
  name: z.string(),
  pattern: patternDefinitionSchema,
  layer_count: countSchema,
  element_count: countSchema,
  color_count: countSchema,
  complexity_score: countSchema,
  price_floor: bonesSchema,
  created_at: z.string(),
  creator_id: z.string().uuid(),
  creator_username: z.string(),
  owner_id: z.string().uuid(),
  owner_username: z.string(),
  active_listing_id: z.string().uuid().nullable(),
  active_price: bonesSchema.nullable(),
  active_listed_at: z.string().nullable(),
  last_listing_id: z.string().uuid().nullable(),
  last_listing_status: z.enum(['active', 'sold', 'cancelled']).nullable(),
  favorite_count: countSchema,
})

const leaderboardRowSchema = z.object({
  listing_id: z.string().uuid(),
  shirt_id: z.string().uuid(),
  name: z.string(),
  pattern: patternDefinitionSchema,
  layer_count: countSchema,
  element_count: countSchema,
  color_count: countSchema,
  complexity_score: countSchema,
  price: bonesSchema,
  purchased_at: z.string(),
  seller_username: z.string(),
  buyer_username: z.string(),
})

const profileSummaryRowSchema = z.object({
  user_id: z.string().uuid(),
  username: z.string(),
  joined_at: z.string(),
  shirts_owned: countSchema,
  shirts_created: countSchema,
  sales_count: countSchema,
})

type CollectionRow = z.infer<typeof collectionRowSchema>
type ViewerContext = { favoriteIds: Set<string>; ownedShirtIds: Set<string> }

function listedLabel(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`
  if (elapsedMinutes < 1_440) return `${Math.floor(elapsedMinutes / 60)} hrs ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function soldLabel(value: string) {
  return listedLabel(value)
}

function joinedLabel(value: string) {
  return `Since ${new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(value))}`
}

function favoriteAnchor(row: CollectionRow) {
  return row.active_listing_id ?? row.last_listing_id
}

function toShirt(input: unknown, viewer?: ViewerContext): Shirt {
  const row = collectionRowSchema.parse(input)
  const anchor = favoriteAnchor(row)
  return {
    id: row.shirt_id,
    listingId: row.active_listing_id,
    name: row.name,
    creator: row.creator_username,
    owner: row.owner_username,
    price: row.active_price,
    priceFloor: row.price_floor,
    complexityScore: row.complexity_score,
    favorites: row.favorite_count,
    isFavorited: anchor ? (viewer?.favoriteIds.has(anchor) ?? false) : false,
    isOwner: viewer?.ownedShirtIds.has(row.shirt_id) ?? false,
    availability: row.active_listing_id ? 'available' : 'unlisted',
    listed: listedLabel(row.active_listed_at ?? row.created_at),
    layers: row.pattern.layers,
  }
}

function toLeaderboardEntry(input: unknown, index: number): LeaderboardEntry {
  const row = leaderboardRowSchema.parse(input)
  return {
    rank: index + 1,
    listingId: row.listing_id,
    shirtId: row.shirt_id,
    name: row.name,
    layers: row.pattern.layers,
    price: row.price,
    soldAt: soldLabel(row.purchased_at),
    seller: row.seller_username,
    buyer: row.buyer_username,
    complexityScore: row.complexity_score,
    layerCount: row.layer_count,
    elementCount: row.element_count,
    colorCount: row.color_count,
  }
}

async function getViewerContext(listingIds: string[], shirtIds: string[]) {
  const user = await getCurrentUser()
  if (!user) return undefined
  const supabase = createSupabaseServerClient()
  const [favoritesResult, ownedResult] = await Promise.all([
    listingIds.length
      ? supabase.from('favorites').select('listing_id').eq('user_id', user.id).in('listing_id', listingIds)
      : Promise.resolve({ data: [], error: null }),
    shirtIds.length
      ? supabase.from('shirts').select('id').eq('owner_id', user.id).in('id', shirtIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (favoritesResult.error) fail(favoritesResult.error, 'Favorite state could not be loaded.')
  if (ownedResult.error) fail(ownedResult.error, 'Ownership state could not be loaded.')
  return {
    favoriteIds: new Set(z.array(z.object({ listing_id: z.string().uuid() })).parse(favoritesResult.data).map((row) => row.listing_id)),
    ownedShirtIds: new Set(z.array(z.object({ id: z.string().uuid() })).parse(ownedResult.data).map((row) => row.id)),
  }
}

async function getCollectionViewerContext(rows: CollectionRow[]) {
  const listingIds = rows.map(favoriteAnchor).filter((value): value is string => Boolean(value))
  return getViewerContext(listingIds, rows.map((row) => row.shirt_id))
}

function fail(error: { message: string; code?: string } | null, fallback: string): never {
  throw new RepositoryError(error?.message ?? fallback, error?.code ?? 'SUPABASE_ERROR')
}

export const supabaseMarketplaceRepository: MarketplaceRepository = {
  async getAccountState() {
    const user = await getCurrentUser()
    if (!user) return { mode: 'guest', configured: true }
    const supabase = createSupabaseServerClient()
    const today = new Date().toISOString().slice(0, 10)
    const [profileResult, walletResult, rewardResult] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', user.id).single(),
      supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
      supabase.from('daily_rewards').select('reward_date').eq('user_id', user.id).eq('reward_date', today).maybeSingle(),
    ])
    if (profileResult.error) fail(profileResult.error, 'The account profile could not be loaded.')
    if (walletResult.error) fail(walletResult.error, 'The Bones balance could not be loaded.')
    if (rewardResult.error) fail(rewardResult.error, 'The allowance status could not be loaded.')
    const username = z.object({ username: z.string() }).parse(profileResult.data).username
    const balance = z.object({ balance: z.coerce.number().int().safe().nonnegative() }).parse(walletResult.data).balance
    const initials = username.split(/[_\s-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'DF'
    return {
      mode: 'authenticated', configured: true, userId: user.id, email: user.email ?? '', username,
      initials, balance, emailVerified: Boolean(user.email_confirmed_at), dailyRewardClaimed: Boolean(rewardResult.data),
    }
  },

  async getMarketplace() {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('shirt_collection')
      .select('*')
      .not('active_listing_id', 'is', null)
      .order('active_listed_at', { ascending: false })
      .limit(100)
    if (error) fail(error, 'The marketplace could not be loaded.')
    const rows = z.array(collectionRowSchema).parse(data)
    const viewer = await getCollectionViewerContext(rows)
    return rows.map((row) => toShirt(row, viewer))
  },

  async getListingDetail(shirtId) {
    if (!z.string().uuid().safeParse(shirtId).success) return null
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.from('shirt_collection').select('*').eq('shirt_id', shirtId).maybeSingle()
    if (error) fail(error, 'The shirt could not be loaded.')
    if (!data) return null
    const row = collectionRowSchema.parse(data)
    const viewer = await getCollectionViewerContext([row])
    return toShirt(row, viewer)
  },

  async getProfile(username) {
    const supabase = createSupabaseServerClient()
    const summaryResult = await supabase.from('profile_summaries').select('*').ilike('username', username).maybeSingle()
    if (summaryResult.error) fail(summaryResult.error, 'The profile could not be loaded.')
    if (!summaryResult.data) return null
    const summary = profileSummaryRowSchema.parse(summaryResult.data)
    const [ownedResult, createdResult] = await Promise.all([
      supabase.from('shirt_collection').select('*').eq('owner_id', summary.user_id).order('created_at', { ascending: false }).limit(60),
      supabase.from('shirt_collection').select('*').eq('creator_id', summary.user_id).order('created_at', { ascending: false }).limit(60),
    ])
    if (ownedResult.error) fail(ownedResult.error, 'The collection could not be loaded.')
    if (createdResult.error) fail(createdResult.error, 'The design history could not be loaded.')
    const ownedRows = z.array(collectionRowSchema).parse(ownedResult.data)
    const createdRows = z.array(collectionRowSchema).parse(createdResult.data)
    const viewer = await getCollectionViewerContext([...ownedRows, ...createdRows])
    return {
      username: summary.username,
      joinedAt: joinedLabel(summary.joined_at),
      shirtsOwned: summary.shirts_owned,
      shirtsCreated: summary.shirts_created,
      salesCount: summary.sales_count,
      owned: ownedRows.map((row) => toShirt(row, viewer)),
      created: createdRows.map((row) => toShirt(row, viewer)),
    }
  },

  async getLeaderboard(limit) {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('leaderboard_sales')
      .select('*')
      .order('complexity_score', { ascending: false })
      .order('price', { ascending: false })
      .order('purchased_at', { ascending: false })
      .limit(limit)
    if (error) fail(error, 'The leaderboard could not be loaded.')
    return z.array(leaderboardRowSchema).parse(data).map(toLeaderboardEntry)
  },

  async createShirt(input) {
    await requireVerifiedUser()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc('create_shirt', {
      p_name: input.name,
      p_pattern: input.pattern,
      p_idempotency_key: input.idempotencyKey,
    })
    if (error || typeof data !== 'string') fail(error, 'The shirt could not be saved.')
    return data
  },

  async createListing(input) {
    await requireVerifiedUser()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc('create_listing', {
      p_shirt_id: input.shirtId,
      p_price: input.price,
      p_idempotency_key: input.idempotencyKey,
    })
    if (error || typeof data !== 'string') fail(error, 'The shirt could not be listed.')
    return data
  },

  async purchaseListing(input) {
    await requireVerifiedUser()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc('purchase_listing', {
      p_listing_id: input.listingId,
      p_idempotency_key: input.idempotencyKey,
    })
    if (error) fail(error, 'The purchase could not be completed.')
    const row = z.array(z.object({
      listing_id: z.string().uuid(), shirt_id: z.string().uuid(), buyer_balance: z.coerce.number().int().safe(),
      seller_proceeds: z.coerce.number().int().safe(), house_cut: z.coerce.number().int().safe(),
    })).length(1).parse(data)[0]
    return { listingId: row.listing_id, shirtId: row.shirt_id, buyerBalance: row.buyer_balance, sellerProceeds: row.seller_proceeds, houseCut: row.house_cut }
  },

  async cancelListing(input) {
    await requireVerifiedUser()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc('cancel_listing', { p_listing_id: input.listingId })
    if (error || typeof data !== 'string') fail(error, 'The listing could not be withdrawn.')
    return { listingId: data }
  },

  async setFavorite(input) {
    await requireVerifiedUser()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc('set_listing_favorite', {
      p_listing_id: input.listingId,
      p_favorite: input.favorite,
    })
    if (error) fail(error, 'The favorite could not be updated.')
    const row = z.array(z.object({ favorited: z.boolean(), favorite_count: z.coerce.number().int().nonnegative() })).length(1).parse(data)[0]
    return { favorited: row.favorited, favoriteCount: row.favorite_count }
  },

  async claimDailyReward(idempotencyKey) {
    await requireVerifiedUser()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.rpc('claim_daily_reward', { p_idempotency_key: idempotencyKey })
    if (error) fail(error, 'The daily allowance could not be collected.')
    const row = z.array(z.object({
      reward_date: z.string(), amount: z.coerce.number().int().positive(),
      balance_after: z.coerce.number().int().nonnegative(), already_claimed: z.boolean(),
    })).length(1).parse(data)[0]
    return { rewardDate: row.reward_date, amount: row.amount, balanceAfter: row.balance_after, alreadyClaimed: row.already_claimed }
  },
}
