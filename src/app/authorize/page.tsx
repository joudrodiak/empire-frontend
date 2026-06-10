'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { fetcher, post } from '@/lib/api'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'
import { LiquidMetalButton } from '@/components/atoms/LiquidMetalButton'

type ClientInfo = { name: string; redirectHosts: string[] }

/** OAuth 2.1 consent screen. MCP clients (claude.ai, Claude Desktop, Cursor…)
 * send the user here with client_id/redirect_uri/state/code_challenge. On
 * Approve the API mints an MCP credential and returns the redirect carrying
 * the authorization code; the client then swaps it for the access token at
 * /api/mcp/oauth/token. Without this round-trip the connector stays
 * "unauthorized" — the old page just dumped users on /mcp and never returned
 * a code. */
export default function AuthorizePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const clientId = params.get('client_id') || ''
  const redirectUri = params.get('redirect_uri') || ''
  const state = params.get('state') || ''
  const codeChallenge = params.get('code_challenge') || ''
  const codeChallengeMethod = params.get('code_challenge_method') || ''

  useEffect(() => {
    if (loading) return
    if (!clientId || !redirectUri) { router.replace('/mcp'); return }
    if (!user) {
      // Full authorize URL (with the OAuth query) survives the login round-trip.
      const next = `${window.location.pathname}${window.location.search}`
      router.replace(`/login?next=${encodeURIComponent(next)}`)
      return
    }
    fetcher(`/api/mcp/oauth/client-info?client_id=${encodeURIComponent(clientId)}`)
      .then(setClient)
      .catch(() => setError('This authorization link is invalid or expired. Go back to the client and reconnect to start a fresh request.'))
  }, [loading, user, clientId, redirectUri, router])

  async function approve() {
    setBusy(true)
    setError('')
    try {
      const r = await post('/api/mcp/oauth/approve', {
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
      })
      window.location.href = r.redirect
    } catch (e: any) {
      setError(e?.message || 'Authorization failed')
      setBusy(false)
    }
  }

  function deny() {
    try {
      const target = new URL(redirectUri)
      target.searchParams.set('error', 'access_denied')
      if (state) target.searchParams.set('state', state)
      window.location.href = target.toString()
    } catch { router.replace('/mcp') }
  }

  const redirectHost = (() => { try { return new URL(redirectUri).host } catch { return redirectUri } })()

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <GlassPanel variant="gold" className="w-full max-w-md p-6">
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-empire-gold/30 bg-empire-gold/10 text-empire-gold">
          <EmpireIcon name="link" size={18} />
        </span>
        <h1 className="mt-3 font-empire text-xl text-empire-text">
          {client ? `Connect ${client.name}` : 'Connect MCP client'}
        </h1>
        <p className="mt-1 text-xs text-empire-text-muted">
          {loading || (!client && !error)
            ? 'Verifying the authorization request…'
            : client
              ? `${client.name} is requesting access to your Empire OS MCP worker. It will act with exactly your profile permissions, and every action lands in the audit trail.`
              : ''}
        </p>
        {client && (
          <div className="mt-4 space-y-2">
            <div className="rounded-lg border border-empire-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-empire-text-dim">Client</p>
              <p className="mt-1 font-data text-xs text-empire-text">{client.name}</p>
            </div>
            <div className="rounded-lg border border-empire-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-empire-text-dim">Returns to</p>
              <p className="mt-1 break-all font-data text-xs text-empire-text">{redirectHost}</p>
            </div>
            <div className="rounded-lg border border-empire-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-empire-text-dim">Signed in as</p>
              <p className="mt-1 font-data text-xs text-empire-text">{user?.email}</p>
            </div>
          </div>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-empire-red-bright/40 bg-empire-red-bright/10 px-3 py-2 text-xs text-empire-red-bright">{error}</p>
        )}
        {client && (
          <div className="mt-5 flex items-center gap-3">
            <LiquidMetalButton size="sm" onClick={approve} disabled={busy}>
              {busy ? 'Authorizing…' : 'Approve connection'}
            </LiquidMetalButton>
            <button
              onClick={deny}
              disabled={busy}
              className="rounded-lg border border-empire-border px-3 py-2 text-xs text-empire-text-muted transition-all duration-200 hover:border-empire-gold/40 hover:text-empire-text"
            >
              Deny
            </button>
          </div>
        )}
        <p className="mt-4 text-[11px] text-empire-text-dim">
          Approving replaces any previous key issued to this client — reconnecting is always safe.
        </p>
      </GlassPanel>
    </main>
  )
}
