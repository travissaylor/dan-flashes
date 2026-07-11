import '@tanstack/react-start/server-only'
import { isSupabaseConfigured } from '@/lib/supabase.server'
import { mockMarketplaceRepository } from './mock-repository.server'
import type { MarketplaceRepository } from './repository'
import { supabaseMarketplaceRepository } from './supabase-repository.server'

export function getMarketplaceRepository(): MarketplaceRepository {
  return isSupabaseConfigured() ? supabaseMarketplaceRepository : mockMarketplaceRepository
}
