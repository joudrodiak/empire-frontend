'use client'
import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import '@aejkatappaja/phantom-ui'
import { useAuth } from '@/lib/auth'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

// Routes reachable without a session.
const PUBLIC = ['/login']

/**
 * AuthGate — wraps the whole app. While the session resolves it shows an empire
 * splash; with no session it redirects to /login (except on public routes). The
 * server is the real enforcement point — this just keeps the unauthenticated
 * surface from rendering company data before the bounce.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isPublic = PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'))

  useEffect(() => {
    if (!loading && !user && !isPublic) router.replace('/login')
  }, [loading, user, isPublic, router])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-empire-void">
        <phantom-ui
          loading
          animation="shimmer"
          shimmer-color="rgba(244,212,119,0.55)"
          background-color="rgba(201,162,51,0.16)"
          fallback-radius={8}
          duration={1.6}
          reveal={0.18}
          loading-label="Loading Empire OS"
        >
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <span className="medallion grid place-items-center" style={{ width: 56, height: 56 }}>
              <EmpireIcon name="crown" size={26} className="relative z-10 text-empire-gold" />
            </span>
            <span className="font-empire text-sm uppercase tracking-[0.3em] text-empire-text-muted">Empire OS</span>
          </div>
        </phantom-ui>
      </div>
    )
  }

  if (!user && !isPublic) return null // redirecting

  return <>{children}</>
}
