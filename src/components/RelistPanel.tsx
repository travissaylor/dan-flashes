import { useRouter } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import { reuseMutationIntent, type MutationIntent } from '@/lib/action-contracts'
import { LISTING_FEE } from '@/lib/economy'
import type { Shirt } from '@/lib/types'
import { createListing } from '@/server/marketplace.functions'

export function RelistPanel({ shirt }: { shirt: Shirt }) {
  const router = useRouter()
  const [price, setPrice] = useState(String(shirt.priceFloor))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const intent = useRef<MutationIntent<{ listing: string }> | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const numericPrice = Number(price)
    if (!Number.isInteger(numericPrice) || numericPrice < shirt.priceFloor || numericPrice > 2_000_000_000) {
      return setError(`The listing must be a whole number from ${shirt.priceFloor.toLocaleString()} to 2,000,000,000 Bones.`)
    }

    const fingerprint = JSON.stringify({ shirtId: shirt.id, price: numericPrice })
    const retrying = intent.current?.fingerprint === fingerprint
    intent.current = reuseMutationIntent(intent.current, fingerprint, () => ({ listing: crypto.randomUUID() }))
    setPending(true)
    setError('')
    setStatus(retrying ? 'Retrying the listing with its original instruction…' : 'Returning the shirt to the floor…')
    try {
      const result = await createListing({ data: { shirtId: shirt.id, price: numericPrice, idempotencyKey: intent.current.keys.listing } })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      intent.current = null
      setStatus('The listing is open.')
      await router.invalidate()
    } catch {
      setError('The relist did not settle. Retry will reuse the same listing instruction.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="relist-form" onSubmit={submit}>
      <p className="relist-copy">Return it to the floor.</p>
      <label><span>Listing price</span><input value={price} onChange={(event) => setPrice(event.target.value)} required type="number" inputMode="numeric" min={shirt.priceFloor} max={2_000_000_000} step="1"/><small>Minimum {shirt.priceFloor.toLocaleString()} · listing fee {LISTING_FEE} Bones</small></label>
      <button type="submit" disabled={pending}>{pending ? 'Settling…' : 'Relist this shirt'} <span>→</span></button>
      <div className={`mutation-status ${error ? 'is-error' : ''}`} role="status" aria-live="polite">{error || status}</div>
    </form>
  )
}
