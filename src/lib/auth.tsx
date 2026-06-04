'use client'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

/**
 * Empire OS client auth. Holds the HS256 session token (issued by /api/auth/login)
 * in localStorage and resolves the live user via /api/auth/me on boot. This is the
 * single source of truth for "who is logged in" — the AuthGate, DockNav and /admin
 * all read it through useAuth(). Permission checks mirror the server catalog so the
 * UI can hide what a role can't do (the server still enforces — UI is a courtesy).
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
export const TOKEN_KEY = 'empire-os-token'

export type AuthRole = { id: string; key: string; name: string; level: number; permissions: string[] }
export type AuthUser = {
  id: string; email: string; name: string; isActive: boolean
  role: AuthRole | null
  rank: { id: string; key: string; name: string; order: number } | null
  employee: { id: string; name: string; role: string } | null
  contract: { id: string; title: string; status: string } | null
  companyId: string | null
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
function setStoredToken(t: string | null) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

export function userCan(user: AuthUser | null, perm: string): boolean {
  const perms = user?.role?.permissions
  if (!Array.isArray(perms)) return false
  return perms.includes('*') || perms.includes(perm)
}
export const isAdmin = (user: AuthUser | null) => user?.role?.key === 'admin' || userCan(user, '*') || userCan(user, 'iam:manage')

type AuthCtx = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) { setUser(null); setLoading(false); return }
    try {
      const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('session expired')
      const body = await res.json()
      setUser(body.user as AuthUser)
    } catch {
      setStoredToken(null); setUser(null)
    } finally { setLoading(false) }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.error || 'Login failed')
    setStoredToken(body.token)
    setUser(body.user as AuthUser)
  }, [])

  const logout = useCallback(() => {
    setStoredToken(null); setUser(null)
    if (typeof window !== 'undefined') window.location.href = '/login'
  }, [])

  useEffect(() => {
    refresh()
    // a 401 anywhere in the api layer dispatches this — force a clean logout.
    const onExpire = () => { setStoredToken(null); setUser(null) }
    if (typeof window !== 'undefined') window.addEventListener('empire-auth-expired', onExpire)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('empire-auth-expired', onExpire) }
  }, [refresh])

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
