import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { AccountState } from '@/lib/types'
import { signOut } from '@/server/auth.functions'
import { claimDailyReward } from '@/server/marketplace.functions'

export function SiteHeader({ account: initialAccount }: { account: AccountState }) {
  const router = useRouter()
  const [account, setAccount] = useState(initialAccount)
  const [rewardPending, setRewardPending] = useState(false)
  const [signOutPending, setSignOutPending] = useState(false)
  const [notice, setNotice] = useState('')
  const rewardKey = useRef<string | null>(null)
  useEffect(() => setAccount(initialAccount), [initialAccount])

  async function collectReward() {
    if (account.mode !== 'authenticated' || rewardPending || account.dailyRewardClaimed) return
    rewardKey.current ??= crypto.randomUUID()
    setRewardPending(true)
    setNotice('')
    try {
      const result = await claimDailyReward({ data: { idempotencyKey: rewardKey.current } })
      if (!result.ok) return setNotice(result.error.message)
      rewardKey.current = null
      setAccount({ ...account, balance: result.data.balanceAfter, dailyRewardClaimed: true })
      setNotice(result.data.alreadyClaimed ? 'Today’s allowance was already entered.' : '250 Bones entered into the record.')
      await router.invalidate()
    } catch {
      setNotice('The allowance did not settle. Retry will reuse the same instruction.')
    } finally {
      setRewardPending(false)
    }
  }

  async function leave() {
    if (signOutPending) return
    setSignOutPending(true)
    try {
      const result = await signOut()
      if (!result.ok) return setNotice(result.error.message)
      window.location.assign('/')
    } catch {
      setNotice('Sign-out did not complete. Try again.')
    } finally {
      setSignOutPending(false)
    }
  }

  return (
    <>
      <div className={`announcement ${account.mode === 'development' ? 'development-announcement' : ''}`}>
        {account.mode === 'development' && 'Development catalog. Transactions remain closed.'}
        {account.mode === 'guest' && 'Account required for Bones and acquisitions.'}
        {account.mode === 'authenticated' && <>{!account.emailVerified ? 'Verify your email to release account privileges.' : account.dailyRewardClaimed ? 'Daily allowance entered.' : 'Daily allowance ready.'} <button type="button" onClick={collectReward} disabled={rewardPending || account.dailyRewardClaimed || !account.emailVerified}>{!account.emailVerified ? 'Verification required' : rewardPending ? 'Collecting…' : account.dailyRewardClaimed ? 'Collected today' : 'Collect 250 Bones'}</button></>}
        <span className="sr-only" role="status" aria-live="polite">{notice}</span>
      </div>
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="Dan Flashes home">
          <span>Dan</span><span>Flashes</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/" activeOptions={{ exact: true }}>Marketplace</Link>
          <Link to="/designer">Design a shirt</Link>
          <a href="/leaderboard">Leaderboard</a>
        </nav>
        {account.mode === 'development' && <div className="account-cluster"><span className="guest-state">Guest preview</span></div>}
        {account.mode === 'guest' && <div className="account-cluster"><Link className="account-link" to="/auth" search={{ next: '/' }}>Sign in</Link></div>}
        {account.mode === 'authenticated' && <div className="account-cluster"><span className="bones-balance"><i /> {account.balance.toLocaleString()} <small>Bones</small></span><a className="account-name" href={`/profiles/${account.username}`}>@{account.username}</a><button className="avatar" type="button" onClick={leave} disabled={signOutPending} aria-label={`Sign out ${account.username}`} title="Sign out">{signOutPending ? '…' : account.initials}</button></div>}
      </header>
    </>
  )
}
