import { describe, expect, it, vi } from 'vitest'
import {
  authInputSchema,
  createListingInputSchema,
  createShirtInputSchema,
  mapActionError,
  purchaseListingInputSchema,
  reuseMutationIntent,
  safeReturnPath,
  signUpInputSchema,
} from './action-contracts'

const uuid = '55e8a31a-f9ce-4f79-9c17-2fe52be51dab'
const pattern = { layers: [{ element: 'plaid' as const, colors: ['#112233', '#abcdef'] as [string, string], scale: 1, rotation: 0 }] }

describe('authenticated action contracts', () => {
  it('validates auth inputs and public usernames', () => {
    expect(authInputSchema.safeParse({ email: 'client@example.com', password: 'eight123', next: '/designer' }).success).toBe(true)
    expect(authInputSchema.safeParse({ email: 'not-email', password: 'short' }).success).toBe(false)
    expect(signUpInputSchema.safeParse({ email: 'client@example.com', password: 'eight123', username: 'bad name' }).success).toBe(false)
  })

  it('validates mutation UUIDs, prices, names, and patterns', () => {
    expect(createShirtInputSchema.safeParse({ name: 'Serious Plaid', pattern, idempotencyKey: uuid }).success).toBe(true)
    expect(createShirtInputSchema.safeParse({ name: '', pattern, idempotencyKey: uuid }).success).toBe(false)
    expect(createListingInputSchema.safeParse({ shirtId: uuid, price: 2500.5, idempotencyKey: uuid }).success).toBe(false)
    expect(purchaseListingInputSchema.safeParse({ listingId: 'not-a-uuid', idempotencyKey: uuid }).success).toBe(false)
  })

  it('allows only local return paths', () => {
    expect(safeReturnPath('/shirts/one?from=auth')).toBe('/shirts/one?from=auth')
    expect(safeReturnPath('//outside.example')).toBe('/')
    expect(safeReturnPath('/\\outside.example')).toBe('/')
    expect(safeReturnPath('https://outside.example')).toBe('/')
  })
})

describe('mutation resilience', () => {
  it('reuses idempotency keys for the same intent and replaces them when inputs change', () => {
    const makeKeys = vi.fn(() => ({ shirt: crypto.randomUUID(), listing: crypto.randomUUID() }))
    const first = reuseMutationIntent(null, 'first', makeKeys)
    const retry = reuseMutationIntent(first, 'first', makeKeys)
    const changed = reuseMutationIntent(retry, 'changed', makeKeys)
    expect(retry).toBe(first)
    expect(changed).not.toBe(first)
    expect(makeKeys).toHaveBeenCalledTimes(2)
  })

  it('maps stale listings and insufficient balances to stable UI errors', () => {
    expect(mapActionError({ code: '55000', message: 'listing ownership is stale' })).toMatchObject({ code: 'LISTING_UNAVAILABLE', retryable: false })
    expect(mapActionError({ code: '55000', message: 'listing is no longer available' })).toMatchObject({ code: 'LISTING_UNAVAILABLE', retryable: false })
    expect(mapActionError({ code: 'P0001', message: 'insufficient Bones' })).toMatchObject({ code: 'INSUFFICIENT_BALANCE', retryable: false })
    expect(mapActionError({ code: 'P0001', message: 'insufficient Bones for listing fee' })).toMatchObject({ code: 'INSUFFICIENT_LISTING_FEE', retryable: false })
  })
})
