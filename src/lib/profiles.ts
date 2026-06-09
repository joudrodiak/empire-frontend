'use client'
import { useEffect, useState } from 'react'
import type { IconName } from '@/components/atoms/EmpireIcon'

/**
 * Empire OS profiles = COMPANIES, not people. Each profile is a distinct
 * company in the portfolio (e.g. Cregen Inc. as a whole) with its own identity
 * and data that is kept totally separate from the other companies. The Empire
 * OS switcher changes which company you are viewing; the app reads
 * `useActiveCompany()` for the brand/identity context. There is no real auth —
 * the active company id is stored in localStorage.
 */
export type Company = {
  id: string
  name: string        // legal / display name
  short: string       // wordmark / compact label
  tagline: string
  type: string        // role in the portfolio
  founded: string
  hq: string
  lead: string        // who runs it (shown as context, not the profile itself)
  icon: IconName
  accent: string
}

export const COMPANIES: Company[] = [
  {
    id: 'cregen',
    name: 'Cregen Inc.',
    short: 'Cregen',
    tagline: 'The command intelligence layer.',
    type: 'Flagship · AI Systems',
    founded: '2023',
    hq: 'Amsterdam, NL',
    lead: 'Joud',
    icon: 'crown',
    accent: '#C9A233',
  },
  {
    id: 'studio',
    name: 'Cregen Studio',
    short: 'Studio',
    tagline: 'Brand, story, and motion.',
    type: 'Creative arm',
    founded: '2024',
    hq: 'Munich, DE',
    lead: 'Maximilian Vogel',
    icon: 'pen-nib',
    accent: '#C9A233',
  },
  {
    id: 'labs',
    name: 'Cregen Labs',
    short: 'Labs',
    tagline: 'Frontier research & autonomous agents.',
    type: 'R&D',
    founded: '2025',
    hq: 'Brussels, BE',
    lead: 'Lukas Beckers',
    icon: 'cog',
    accent: '#C9A233',
  },
  {
    id: 'advisory',
    name: 'Advisory Board',
    short: 'Advisory',
    tagline: 'Outside counsel & governance.',
    type: 'Governance',
    founded: '2023',
    hq: 'Kuwait City, KW',
    lead: 'Dr. Eyad Al-Shammari',
    icon: 'scales',
    accent: '#2A2A44',
  },
]

/**
 * Back-compat view: older callers read `Profile` with person/company/role.
 * A company exposes the same surface (person = lead, company = name,
 * role = type) so nothing breaks while the model is company-first.
 */
export type Profile = Company & { person: string; company: string; role: string }
export const PROFILES: Profile[] = COMPANIES.map(c => ({
  ...c,
  person: c.lead,
  company: c.name,
  role: c.type,
}))

const KEY = 'empire-os-active-profile'
const EVT = 'empire-profile-change'

function useActiveCompanyId(): [string, (id: string) => void] {
  const [id, setId] = useState<string>(COMPANIES[0].id)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved && COMPANIES.some(c => c.id === saved)) setId(saved)
    } catch { /* SSR / no storage */ }
  }, [])
  const select = (next: string) => {
    setId(next)
    try { localStorage.setItem(KEY, next) } catch { /* noop */ }
    // Let any listener (header, greeting) react without a full reload.
    window.dispatchEvent(new CustomEvent(EVT, { detail: next }))
  }
  // Keep multiple mounts in sync.
  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent).detail as string
      if (next && next !== id) setId(next)
    }
    window.addEventListener(EVT, onChange)
    return () => window.removeEventListener(EVT, onChange)
  }, [id])
  return [id, select]
}

/** Company-first hook — the canonical one going forward. */
export function useActiveCompany(): [Company, (id: string) => void] {
  const [id, select] = useActiveCompanyId()
  const active = COMPANIES.find(c => c.id === id) ?? COMPANIES[0]
  return [active, select]
}

/** Back-compat hook returning the Profile view of the active company. */
export function useActiveProfile(): [Profile, (id: string) => void] {
  const [id, select] = useActiveCompanyId()
  const active = PROFILES.find(p => p.id === id) ?? PROFILES[0]
  return [active, select]
}
