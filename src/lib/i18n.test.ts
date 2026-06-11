import { describe, it, expect } from 'vitest'
import { MESSAGES, LOCALES, type Locale, type MsgKey } from './i18n'

/**
 * B1 guardrails: every locale dictionary carries the exact same key set as
 * English (no silently-missing translations), locale metadata is complete,
 * and Arabic is the only RTL locale.
 */
describe('i18n dictionaries', () => {
  const enKeys = Object.keys(MESSAGES.en).sort()

  it('covers all five required languages', () => {
    expect(LOCALES.map(l => l.code).sort()).toEqual(['ar', 'de', 'en', 'nl', 'zh'])
  })

  it.each(LOCALES.map(l => l.code))('locale %s has the full EN key set with non-empty values', (code: Locale) => {
    const dict = MESSAGES[code]
    expect(Object.keys(dict).sort()).toEqual(enKeys)
    for (const [k, v] of Object.entries(dict)) {
      expect(typeof v).toBe('string')
      expect((v as string).length).toBeGreaterThan(0)
      if (k === 'nav.mcp') continue // brand acronym, identical everywhere
    }
  })

  it('only Arabic is RTL', () => {
    expect(LOCALES.filter(l => l.dir === 'rtl').map(l => l.code)).toEqual(['ar'])
  })

  it('locales map to valid Intl tags', () => {
    for (const l of LOCALES) {
      // throws RangeError on an invalid tag
      expect(new Intl.NumberFormat(l.tag).format(1234.5)).toBeTruthy()
      expect(new Intl.DateTimeFormat(l.tag, { month: 'long' }).format(new Date(2024, 0, 1))).toBeTruthy()
    }
  })

  it('non-English locales actually translate (not EN copies)', () => {
    for (const code of ['ar', 'nl', 'zh', 'de'] as const) {
      const differing = (Object.keys(MESSAGES.en) as MsgKey[]).filter(k => MESSAGES[code][k] !== MESSAGES.en[k])
      // allow shared brand terms (MCP, Operator/Agent cognates) but the bulk must differ
      expect(differing.length).toBeGreaterThan(Object.keys(MESSAGES.en).length * 0.8)
    }
  })
})
