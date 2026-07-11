import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { patternDefinitionSchema } from '@/lib/pattern'
import { createSupabaseServerClient, getCurrentUser, requireVerifiedUser } from '@/lib/supabase.server'
import { RepositoryError, type MarketplaceRepository } from './repository'

const listingRowSchema = z.object({
  listing_id: z.string().uuid(),
  shirt_id: z.string().uuid(),
  name: z.string(),
  creator_username: z.string(),
  price: z.coerce.number().int().safe(),
  status: z.enum(['active', 'sold', 'cancelled']),
  created_at: z.string(),
  pattern: patternDefinitionSchema,
  favorite_count: z.coerce.number().int().nonnegative(),
})

function listedLabel(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`
  if (elapsedMinutes < 1_440) return `${Math.floor(elapsedMinutes / 60)} hrs ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function toShirt(input: unknown, viewer?: { favoriteIds: Set<string>; ownedShirtIds: Set<string> }) {
  const row = listingRowSchema.parse(input)
  return {
    id: row.shirt_id,
    listingId: row.listing_id,
    name: row.name,
    creator: row.creator_username,
    price: row.price,
    favorites: row.favorite_count,
    isFavorited: viewer?.favoriteIds.has(row.listing_id) ?? false,
    isOwner: viewer?.ownedShirtIds.has(row.shirt_id) ?? false,
    availability: row.status === 'active' ? ('available' as const) : ('sold' as const),
    listed: listedLabel(row.created_at),
    status: row.status === 'sold' ? ('sold' as const) : ('listed' as const),
    layers: row.pattern.layers,
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
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) fail(error, 'The marketplace could not be loaded.')
    const rows = z.array(listingRowSchema).parse(data)
    const viewer = await getViewerContext(rows.map((row) => row.listing_id), rows.map((row) => row.shirt_id))
    return rows.map((row) => toShirt(row, viewer))
  },

  async getListingDetail(shirtId) {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('shirt_id', shirtId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) fail(error, 'The listing could not be loaded.')
    if (!data) return null
    const row = listingRowSchema.parse(data)
    const viewer = await getViewerContext([row.listing_id], [row.shirt_id])
    return toShirt(row, viewer)
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
