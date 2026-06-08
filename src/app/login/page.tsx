'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'
import { PasswordInput } from '@/components/molecules/PasswordInput'

/**
 * Empire OS login portal. Exchanges email + password for a session token
 * (POST /api/auth/login) via the auth context, then returns to the Throne room.
 * Liquid-glass card on a vignette void — no dock (DockNav hides on /login).
 */
export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next') || '/'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already authenticated → leave the portal.
  useEffect(() => { if (!loading && user) router.replace(next) }, [loading, user, router, next])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      await login(email.trim(), password)
      router.replace(next)
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally { setBusy(false) }
  }

  const field = 'w-full rounded-lg border border-empire-border bg-empire-surface/60 px-3.5 py-2.5 text-sm text-empire-text placeholder:text-empire-text-dim outline-none transition-colors focus:border-empire-gold/50'

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-empire-void px-4">
      <div className="glass-gold relative w-full max-w-md animate-slide-up p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="medallion grid place-items-center" style={{ width: 56, height: 56 }}>
            <EmpireIcon name="crown" size={26} className="relative z-10 text-empire-gold" />
          </span>
          <div>
            <h1 className="font-empire text-xl tracking-[0.25em] text-empire-text uppercase">Empire OS</h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-empire-text-muted">Company intelligence app</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-empire-text-muted">Email</label>
            <input type="email" autoComplete="username" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-empire-text-muted">Password</label>
            <PasswordInput autoComplete="current-password" required value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" inputClassName={field} />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-empire-red/40 bg-empire-red/10 px-3 py-2 text-xs text-empire-red-bright">
              <EmpireIcon name="alert" size={14} /> {error}
            </div>
          )}

          <div className="pt-1">
            <LiquidMetalButton type="submit" variant="gold" icon={<EmpireIcon name="lock" size={15} />}
              className="w-full justify-center" disabled={busy}>
              {busy ? 'Entering…' : 'Enter the Empire'}
            </LiquidMetalButton>
          </div>
        </form>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-empire-text-dim">
          Sessions are tied to your contract &amp; role
        </p>
      </div>
    </div>
  )
}
