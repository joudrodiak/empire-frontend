/**
 * Empire OS canonical vocabulary. Single source of truth so the rename
 * (department/team → UNIT, microservice → DOMAIN) stays consistent and any
 * future change is one edit. Use these instead of hard-coding the words.
 */
export const TERMS = {
  product: 'Empire OS',
  unit: 'Unit',
  units: 'Units',
  unitLower: 'unit',
  unitsLower: 'units',
  domain: 'Domain',
  domains: 'Domains',
  domainLower: 'domain',
  domainsLower: 'domains',
} as const

// Back-compat helpers for places still thinking in the old nouns.
export const labelForDept = (plural = false) => (plural ? TERMS.units : TERMS.unit)
export const labelForService = (plural = false) => (plural ? TERMS.domains : TERMS.domain)
