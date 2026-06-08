'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { GlassPanel } from '@/components/atoms/GlassPanel'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

export default function AuthorizePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    if (loading) return
    const query = params.toString()
    const source = String(params.get('client_id') || '').toLowerCase().includes('claude') ? 'claude' : 'codex'
    const next = `/mcp?connect=${source}${query ? `&authorize=${encodeURIComponent(query)}` : ''}`
    if (user) router.replace(next)
    else router.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [loading, params, router, user])

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <GlassPanel variant="gold" className="max-w-md p-5 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg border border-empire-gold/30 bg-empire-gold/10 text-empire-gold">
          <EmpireIcon name="link" size={18} />
        </span>
        <h1 className="mt-3 font-empire text-xl text-empire-text">Opening MCP wizard</h1>
        <p className="mt-1 text-xs text-empire-text-muted">Preparing the Empire OS client-id token confirmation flow.</p>
      </GlassPanel>
    </main>
  )
}
