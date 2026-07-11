import { z } from 'zod'
import { patternDefinitionSchema } from './pattern'

export const uuidSchema = z.string().uuid()

export const createShirtInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  pattern: patternDefinitionSchema,
  idempotencyKey: uuidSchema,
}).strict()

export const createListingInputSchema = z.object({
  shirtId: uuidSchema,
  price: z.number().int().positive().max(2_000_000_000),
  idempotencyKey: uuidSchema,
}).strict()

export const purchaseListingInputSchema = z.object({ listingId: uuidSchema, idempotencyKey: uuidSchema }).strict()
export const favoriteInputSchema = z.object({ listingId: uuidSchema, favorite: z.boolean() }).strict()
export const dailyRewardInputSchema = z.object({ idempotencyKey: uuidSchema }).strict()

export const authInputSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  next: z.string().max(500).optional(),
}).strict()

export const signUpInputSchema = authInputSchema.extend({
  username: z.string().trim().min(3).max(15).regex(/^[a-zA-Z0-9_]+$/),
}).strict()

export type ActionErrorCode =
  | 'UNAUTHENTICATED'
  | 'EMAIL_NOT_VERIFIED'
  | 'NOT_CONFIGURED'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_LISTING_FEE'
  | 'LISTING_UNAVAILABLE'
  | 'OWN_LISTING'
  | 'PRICE_BELOW_FLOOR'
  | 'INVALID_CREDENTIALS'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'

export type ActionError = { code: ActionErrorCode; message: string; retryable: boolean }
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError }

export function mapActionError(error: unknown): ActionError {
  const source = typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error)
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const message = source.toLowerCase()

  if (code === 'SUPABASE_NOT_CONFIGURED' || message.includes('not configured')) {
    return { code: 'NOT_CONFIGURED', message: 'Transactions are unavailable in the development catalog.', retryable: false }
  }
  if (code === 'UNAUTHENTICATED' || message.includes('authentication required') || message.includes('sign in to continue')) {
    return { code: 'UNAUTHENTICATED', message: 'Sign in before conducting serious shirt business.', retryable: false }
  }
  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before moving Bones.', retryable: false }
  }
  if (message.includes('insufficient bones for listing fee')) {
    return { code: 'INSUFFICIENT_LISTING_FEE', message: 'The 100 Bones listing fee exceeds your current holdings.', retryable: false }
  }
  if (message.includes('insufficient bones')) {
    return { code: 'INSUFFICIENT_BALANCE', message: 'Your wallet cannot support this level of complication.', retryable: false }
  }
  if (message.includes('no longer available') || message.includes('ownership is stale') || message.includes('listing not found')) {
    return { code: 'LISTING_UNAVAILABLE', message: 'This listing is no longer available. The floor moved first.', retryable: false }
  }
  if (message.includes('already own this shirt') || message.includes('only the owner may')) {
    return { code: 'OWN_LISTING', message: 'You already control this shirt.', retryable: false }
  }
  if (message.includes('below the complexity floor')) {
    return { code: 'PRICE_BELOW_FLOOR', message: 'The listing price cannot deny the pattern’s complexity.', retryable: false }
  }
  if (message.includes('invalid login credentials')) {
    return { code: 'INVALID_CREDENTIALS', message: 'Those credentials did not clear authentication.', retryable: false }
  }
  if (error instanceof z.ZodError) {
    return { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Review the submitted values.', retryable: false }
  }
  return { code: 'UNKNOWN', message: 'The transaction did not settle. Your intent has been preserved for retry.', retryable: true }
}

export function safeReturnPath(value: string | undefined | null, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  return value
}

export type MutationIntent<T> = { fingerprint: string; keys: T }

export function reuseMutationIntent<T>(
  current: MutationIntent<T> | null,
  fingerprint: string,
  createKeys: () => T,
): MutationIntent<T> {
  return current?.fingerprint === fingerprint ? current : { fingerprint, keys: createKeys() }
}
