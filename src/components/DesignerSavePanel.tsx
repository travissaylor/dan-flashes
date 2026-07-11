import { Link } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import { reuseMutationIntent, type MutationIntent } from '@/lib/action-contracts'
import { LISTING_FEE } from '@/lib/economy'
import type { PatternLayer, AccountState } from '@/lib/types'
import { createListing, createShirt } from '@/server/marketplace.functions'

type SaveKeys = { shirt: string; listing: string; shirtId?: string }

export function DesignerSavePanel({ layers, floor, account }: { layers: PatternLayer[]; floor: number; account: AccountState }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState(String(floor))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const intent = useRef<MutationIntent<SaveKeys> | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || account.mode !== 'authenticated') return
    const trimmedName = name.trim()
    const numericPrice = Number(price)
    if (!trimmedName || trimmedName.length > 80) return setError('Give the shirt a name between 1 and 80 characters.')
    if (!Number.isInteger(numericPrice) || numericPrice < floor || numericPrice > 2_000_000_000) return setError(`The listing must be a whole number from ${floor.toLocaleString()} to 2,000,000,000 Bones.`)

    const fingerprint = JSON.stringify({ name: trimmedName, price: numericPrice, layers })
    intent.current = reuseMutationIntent(intent.current, fingerprint, () => ({ shirt: crypto.randomUUID(), listing: crypto.randomUUID() }))
    setPending(true)
    setError('')
    setStatus(intent.current.keys.shirtId ? 'Retrying the listing with its original instruction…' : 'Entering the shirt into the permanent record…')
    try {
      let shirtId = intent.current.keys.shirtId
      if (!shirtId) {
        const shirtResult = await createShirt({ data: { name: trimmedName, pattern: { layers }, idempotencyKey: intent.current.keys.shirt } })
        if (!shirtResult.ok) return setError(shirtResult.error.message)
        shirtId = shirtResult.data.shirtId
        intent.current = { ...intent.current, keys: { ...intent.current.keys, shirtId } }
      }
      setStatus('Shirt saved. Paying the listing fee and opening the floor…')
      const listingResult = await createListing({ data: { shirtId, price: numericPrice, idempotencyKey: intent.current.keys.listing } })
      if (!listingResult.ok) {
        setError(`The shirt is saved, but not listed. ${listingResult.error.message}`)
        return
      }
      intent.current = null
      setStatus('The listing is open.')
      window.location.assign(`/shirts/${shirtId}`)
    } catch {
      setError('The save did not settle. Retry will reuse the same shirt and listing instructions.')
    } finally {
      setPending(false)
    }
  }

  if (account.mode !== 'authenticated') {
    return <div className="designer-save-guest">{account.mode === 'guest' ? <Link to="/auth" search={{ next: '/designer' }}>Sign in to save and list <span>→</span></Link> : <span>Saving requires a configured Supabase project.</span>}</div>
  }

  return (
    <form className="designer-save-form" onSubmit={submit}>
      <label><span>Shirt name</span><input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="An accountable title"/></label>
      <label><span>Listing price</span><input value={price} onChange={(event) => setPrice(event.target.value)} required type="number" inputMode="numeric" min={floor} max={2_000_000_000} step="1"/><small>Minimum {floor.toLocaleString()} · listing fee {LISTING_FEE} Bones</small></label>
      <button type="submit" disabled={pending}>{pending ? 'Settling…' : 'Save and list this shirt'} <span>→</span></button>
      <div className={`mutation-status ${error ? 'is-error' : ''}`} role="status" aria-live="polite">{error || status}</div>
    </form>
  )
}
