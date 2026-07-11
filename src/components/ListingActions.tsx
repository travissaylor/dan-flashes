import { Link, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { AccountState, Shirt } from '@/lib/types'
import { purchaseListing, setListingFavorite } from '@/server/marketplace.functions'

export function ListingActions({ shirt, account }: { shirt: Shirt; account: AccountState }) {
  const router = useRouter()
  const [available, setAvailable] = useState(shirt.availability === 'available')
  const [favorited, setFavorited] = useState(shirt.isFavorited)
  const [favoriteCount, setFavoriteCount] = useState(shirt.favorites)
  const [purchasePending, setPurchasePending] = useState(false)
  const [favoritePending, setFavoritePending] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const purchaseKey = useRef<string | null>(null)

  const transactional = account.mode === 'authenticated' && shirt.listingId !== null

  async function purchase() {
    if (!transactional || !available || shirt.isOwner || purchasePending) return
    purchaseKey.current ??= crypto.randomUUID()
    setPurchasePending(true)
    setError('')
    setStatus('')
    try {
      const result = await purchaseListing({ data: { listingId: shirt.listingId!, idempotencyKey: purchaseKey.current } })
      if (!result.ok) {
        setError(result.error.message)
        if (result.error.code === 'LISTING_UNAVAILABLE') {
          setAvailable(false)
          await router.invalidate()
        }
        return
      }
      purchaseKey.current = null
      setAvailable(false)
      setStatus(`Ownership transferred. ${result.data.buyerBalance.toLocaleString()} Bones remain.`)
      await router.invalidate()
    } catch {
      setError('The transaction did not settle. Retry will use the same purchase instruction.')
    } finally {
      setPurchasePending(false)
    }
  }

  async function toggleFavorite() {
    if (!transactional || favoritePending) return
    setFavoritePending(true)
    setError('')
    try {
      const result = await setListingFavorite({ data: { listingId: shirt.listingId!, favorite: !favorited } })
      if (!result.ok) return setError(result.error.message)
      setFavorited(result.data.favorited)
      setFavoriteCount(result.data.favoriteCount)
    } catch {
      setError('Admiration could not be recorded. Try again.')
    } finally {
      setFavoritePending(false)
    }
  }

  if (account.mode !== 'authenticated') {
    return (
      <div className="listing-actions">
        {account.mode === 'guest'
          ? <Link className="buy-button" to="/auth" search={{ next: `/shirts/${shirt.id}` }}>Sign in to acquire <span>→</span></Link>
          : <button className="buy-button" type="button" disabled>Transactions require Supabase <span>—</span></button>}
        <p className="purchase-note">{account.mode === 'guest' ? 'Your place on the floor will be preserved.' : 'The development catalog is public and read-only.'}</p>
      </div>
    )
  }

  const purchaseLabel = purchasePending ? 'Transferring ownership…' : !available ? 'No longer available' : shirt.isOwner ? 'Already in your collection' : 'Acquire this shirt'
  return (
    <div className="listing-actions">
      <div className="favorite-row"><button type="button" className={favorited ? 'favorite-button is-active' : 'favorite-button'} onClick={toggleFavorite} disabled={favoritePending} aria-pressed={favorited}>{favoritePending ? 'Recording…' : favorited ? 'Admired' : 'Mark as admired'} <span>{favoriteCount}</span></button></div>
      <button className="buy-button" type="button" onClick={purchase} disabled={purchasePending || !available || shirt.isOwner}>{purchaseLabel} <span>{available && !shirt.isOwner ? '→' : '—'}</span></button>
      <p className="purchase-note">Ownership transfers immediately. No returns. There is only one.</p>
      <div className={`mutation-status ${error ? 'is-error' : ''}`} role="status" aria-live="polite">{error || status}</div>
    </div>
  )
}
