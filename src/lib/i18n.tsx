'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'

/**
 * i18n (backlog B1) — platform-wide language support without an external
 * runtime dep (static export stays dependency-free). One dictionary per
 * locale covering the app chrome (dock, login, settings, shared controls);
 * department/domain content keeps its operational English terms.
 *
 * `useI18n()` gives `t`, the active locale, and Intl-backed formatters that
 * follow the chosen language (dates, numbers, currency). Arabic flips the
 * document to RTL via `dir` on <html>; a boot script in layout.tsx applies
 * the persisted choice before first paint so there is no LTR flash.
 */
export type Locale = 'en' | 'ar' | 'nl' | 'zh' | 'de'
export const LOCALE_KEY = 'empire-os-locale'

export const LOCALES: { code: Locale; label: string; english: string; dir: 'ltr' | 'rtl'; tag: string }[] = [
  { code: 'en', label: 'English', english: 'English', dir: 'ltr', tag: 'en-GB' },
  { code: 'ar', label: 'العربية', english: 'Arabic', dir: 'rtl', tag: 'ar' },
  { code: 'nl', label: 'Nederlands', english: 'Dutch', dir: 'ltr', tag: 'nl-NL' },
  { code: 'zh', label: '中文', english: 'Chinese', dir: 'ltr', tag: 'zh-CN' },
  { code: 'de', label: 'Deutsch', english: 'German', dir: 'ltr', tag: 'de-DE' },
]

const EN = {
  'nav.overview': 'Overview',
  'nav.approvals': 'Approvals',
  'nav.operator': 'Operator',
  'nav.mcp': 'MCP',
  'nav.education': 'Education',
  'nav.settings': 'Settings',
  'nav.units': 'Units',
  'nav.domains': 'Domains',
  'nav.adminIam': 'Admin & IAM',
  'nav.booklet': 'System Booklet',
  'nav.signOut': 'Sign out',
  'common.save': 'Save changes',
  'common.saving': 'Saving…',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.deleting': 'Deleting…',
  'common.loading': 'Loading…',
  'common.search': 'Search',
  'common.today': 'Today',
  'common.clear': 'Clear',
  'common.total': 'total',
  'common.connected': 'Connected',
  'common.notSet': 'Not set',
  'common.set': 'Set',
  'common.missing': 'Missing',
  'common.live': 'Live',
  'common.off': 'Off',
  'common.prevPage': 'Previous page',
  'common.nextPage': 'Next page',
  'common.selectDate': 'Select date',
  'login.product': 'Company intelligence app',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.enter': 'Enter the Empire',
  'login.entering': 'Entering…',
  'login.sessions': 'Sessions are tied to your contract & role',
  'login.failed': 'Login failed',
  'settings.title': 'Settings',
  'settings.subtitle': 'Integrations, agent configuration, company identity and environment wiring.',
  'settings.tabIntegrations': 'Integrations',
  'settings.tabAgent': 'Agent',
  'settings.tabCompany': 'Company',
  'settings.tabAppearance': 'Appearance',
  'settings.tabEnvironment': 'Environment',
  'settings.language': 'Language',
  'settings.languageHint': 'Interface language. Applies instantly and persists on this device. Arabic switches the layout to right-to-left.',
  'settings.textSize': 'Text size',
  'settings.textSizeHint': 'Scales the entire interface. Applies instantly and persists on this device.',
  'settings.currency': 'Currency',
  'settings.currencyHint': 'Symbol shown inside money fields across the platform. Persists on this device.',
  'settings.scaleSmall': 'Small',
  'settings.scaleMedium': 'Medium',
  'settings.scaleLarge': 'Large',
  'settings.scaleSmallHint': 'Dense — more on screen',
  'settings.scaleMediumHint': 'Default — balanced reading size',
  'settings.scaleLargeHint': 'Comfort — bigger everything',
  'settings.themeNote': 'Dark / light theme is toggled from the dock at the bottom of the screen.',
}
export type MsgKey = keyof typeof EN

const AR: Record<MsgKey, string> = {
  'nav.overview': 'نظرة عامة',
  'nav.approvals': 'الموافقات',
  'nav.operator': 'المشغّل',
  'nav.mcp': 'MCP',
  'nav.education': 'التعليم',
  'nav.settings': 'الإعدادات',
  'nav.units': 'الوحدات',
  'nav.domains': 'المجالات',
  'nav.adminIam': 'الإدارة والصلاحيات',
  'nav.booklet': 'كتيّب النظام',
  'nav.signOut': 'تسجيل الخروج',
  'common.save': 'حفظ التغييرات',
  'common.saving': 'جارٍ الحفظ…',
  'common.cancel': 'إلغاء',
  'common.delete': 'حذف',
  'common.deleting': 'جارٍ الحذف…',
  'common.loading': 'جارٍ التحميل…',
  'common.search': 'بحث',
  'common.today': 'اليوم',
  'common.clear': 'مسح',
  'common.total': 'الإجمالي',
  'common.connected': 'متصل',
  'common.notSet': 'غير مضبوط',
  'common.set': 'مضبوط',
  'common.missing': 'مفقود',
  'common.live': 'مباشر',
  'common.off': 'متوقف',
  'common.prevPage': 'الصفحة السابقة',
  'common.nextPage': 'الصفحة التالية',
  'common.selectDate': 'اختر التاريخ',
  'login.product': 'تطبيق ذكاء الشركات',
  'login.email': 'البريد الإلكتروني',
  'login.password': 'كلمة المرور',
  'login.enter': 'ادخل الإمبراطورية',
  'login.entering': 'جارٍ الدخول…',
  'login.sessions': 'الجلسات مرتبطة بعقدك ودورك',
  'login.failed': 'فشل تسجيل الدخول',
  'settings.title': 'الإعدادات',
  'settings.subtitle': 'التكاملات، إعداد الوكيل، هوية الشركة وتهيئة البيئة.',
  'settings.tabIntegrations': 'التكاملات',
  'settings.tabAgent': 'الوكيل',
  'settings.tabCompany': 'الشركة',
  'settings.tabAppearance': 'المظهر',
  'settings.tabEnvironment': 'البيئة',
  'settings.language': 'اللغة',
  'settings.languageHint': 'لغة الواجهة. تُطبَّق فورًا وتُحفَظ على هذا الجهاز. العربية تُحوِّل التخطيط إلى اليمين-لليسار.',
  'settings.textSize': 'حجم النص',
  'settings.textSizeHint': 'يغيّر حجم الواجهة بالكامل. يُطبَّق فورًا ويُحفَظ على هذا الجهاز.',
  'settings.currency': 'العملة',
  'settings.currencyHint': 'الرمز المعروض في حقول المال عبر المنصة. يُحفَظ على هذا الجهاز.',
  'settings.scaleSmall': 'صغير',
  'settings.scaleMedium': 'متوسط',
  'settings.scaleLarge': 'كبير',
  'settings.scaleSmallHint': 'كثيف — محتوى أكثر على الشاشة',
  'settings.scaleMediumHint': 'افتراضي — حجم قراءة متوازن',
  'settings.scaleLargeHint': 'مريح — كل شيء أكبر',
  'settings.themeNote': 'الوضع الداكن / الفاتح يُبدَّل من الشريط أسفل الشاشة.',
}

const NL: Record<MsgKey, string> = {
  'nav.overview': 'Overzicht',
  'nav.approvals': 'Goedkeuringen',
  'nav.operator': 'Operator',
  'nav.mcp': 'MCP',
  'nav.education': 'Educatie',
  'nav.settings': 'Instellingen',
  'nav.units': 'Eenheden',
  'nav.domains': 'Domeinen',
  'nav.adminIam': 'Beheer & IAM',
  'nav.booklet': 'Systeemboekje',
  'nav.signOut': 'Uitloggen',
  'common.save': 'Wijzigingen opslaan',
  'common.saving': 'Opslaan…',
  'common.cancel': 'Annuleren',
  'common.delete': 'Verwijderen',
  'common.deleting': 'Verwijderen…',
  'common.loading': 'Laden…',
  'common.search': 'Zoeken',
  'common.today': 'Vandaag',
  'common.clear': 'Wissen',
  'common.total': 'totaal',
  'common.connected': 'Verbonden',
  'common.notSet': 'Niet ingesteld',
  'common.set': 'Ingesteld',
  'common.missing': 'Ontbreekt',
  'common.live': 'Live',
  'common.off': 'Uit',
  'common.prevPage': 'Vorige pagina',
  'common.nextPage': 'Volgende pagina',
  'common.selectDate': 'Kies datum',
  'login.product': 'Bedrijfsintelligentie-app',
  'login.email': 'E-mail',
  'login.password': 'Wachtwoord',
  'login.enter': 'Betreed het Empire',
  'login.entering': 'Bezig…',
  'login.sessions': 'Sessies zijn gekoppeld aan je contract & rol',
  'login.failed': 'Inloggen mislukt',
  'settings.title': 'Instellingen',
  'settings.subtitle': 'Integraties, agentconfiguratie, bedrijfsidentiteit en omgevingsinstellingen.',
  'settings.tabIntegrations': 'Integraties',
  'settings.tabAgent': 'Agent',
  'settings.tabCompany': 'Bedrijf',
  'settings.tabAppearance': 'Weergave',
  'settings.tabEnvironment': 'Omgeving',
  'settings.language': 'Taal',
  'settings.languageHint': 'Interfacetaal. Direct toegepast en bewaard op dit apparaat. Arabisch schakelt naar rechts-naar-links.',
  'settings.textSize': 'Tekstgrootte',
  'settings.textSizeHint': 'Schaalt de hele interface. Direct toegepast en bewaard op dit apparaat.',
  'settings.currency': 'Valuta',
  'settings.currencyHint': 'Symbool in geldvelden door het hele platform. Bewaard op dit apparaat.',
  'settings.scaleSmall': 'Klein',
  'settings.scaleMedium': 'Middel',
  'settings.scaleLarge': 'Groot',
  'settings.scaleSmallHint': 'Compact — meer op het scherm',
  'settings.scaleMediumHint': 'Standaard — gebalanceerde leesgrootte',
  'settings.scaleLargeHint': 'Comfort — alles groter',
  'settings.themeNote': 'Donker / licht thema wissel je via het dock onderaan het scherm.',
}

const ZH: Record<MsgKey, string> = {
  'nav.overview': '总览',
  'nav.approvals': '审批',
  'nav.operator': '操作员',
  'nav.mcp': 'MCP',
  'nav.education': '教程',
  'nav.settings': '设置',
  'nav.units': '部门',
  'nav.domains': '领域',
  'nav.adminIam': '管理与权限',
  'nav.booklet': '系统手册',
  'nav.signOut': '退出登录',
  'common.save': '保存更改',
  'common.saving': '保存中…',
  'common.cancel': '取消',
  'common.delete': '删除',
  'common.deleting': '删除中…',
  'common.loading': '加载中…',
  'common.search': '搜索',
  'common.today': '今天',
  'common.clear': '清除',
  'common.total': '总计',
  'common.connected': '已连接',
  'common.notSet': '未设置',
  'common.set': '已设置',
  'common.missing': '缺失',
  'common.live': '在线',
  'common.off': '关闭',
  'common.prevPage': '上一页',
  'common.nextPage': '下一页',
  'common.selectDate': '选择日期',
  'login.product': '企业智能平台',
  'login.email': '邮箱',
  'login.password': '密码',
  'login.enter': '进入帝国',
  'login.entering': '进入中…',
  'login.sessions': '会话与您的合同和角色绑定',
  'login.failed': '登录失败',
  'settings.title': '设置',
  'settings.subtitle': '集成、代理配置、公司身份与环境配置。',
  'settings.tabIntegrations': '集成',
  'settings.tabAgent': '代理',
  'settings.tabCompany': '公司',
  'settings.tabAppearance': '外观',
  'settings.tabEnvironment': '环境',
  'settings.language': '语言',
  'settings.languageHint': '界面语言。立即生效并保存在本设备上。阿拉伯语会切换为从右到左布局。',
  'settings.textSize': '文字大小',
  'settings.textSizeHint': '缩放整个界面。立即生效并保存在本设备上。',
  'settings.currency': '货币',
  'settings.currencyHint': '平台中金额字段显示的符号。保存在本设备上。',
  'settings.scaleSmall': '小',
  'settings.scaleMedium': '中',
  'settings.scaleLarge': '大',
  'settings.scaleSmallHint': '紧凑 — 屏幕显示更多',
  'settings.scaleMediumHint': '默认 — 均衡的阅读大小',
  'settings.scaleLargeHint': '舒适 — 全部更大',
  'settings.themeNote': '深色 / 浅色主题可在屏幕底部的程序坞切换。',
}

const DE: Record<MsgKey, string> = {
  'nav.overview': 'Übersicht',
  'nav.approvals': 'Freigaben',
  'nav.operator': 'Operator',
  'nav.mcp': 'MCP',
  'nav.education': 'Schulung',
  'nav.settings': 'Einstellungen',
  'nav.units': 'Einheiten',
  'nav.domains': 'Domänen',
  'nav.adminIam': 'Verwaltung & IAM',
  'nav.booklet': 'Systembroschüre',
  'nav.signOut': 'Abmelden',
  'common.save': 'Änderungen speichern',
  'common.saving': 'Speichern…',
  'common.cancel': 'Abbrechen',
  'common.delete': 'Löschen',
  'common.deleting': 'Löschen…',
  'common.loading': 'Laden…',
  'common.search': 'Suchen',
  'common.today': 'Heute',
  'common.clear': 'Leeren',
  'common.total': 'gesamt',
  'common.connected': 'Verbunden',
  'common.notSet': 'Nicht gesetzt',
  'common.set': 'Gesetzt',
  'common.missing': 'Fehlt',
  'common.live': 'Live',
  'common.off': 'Aus',
  'common.prevPage': 'Vorherige Seite',
  'common.nextPage': 'Nächste Seite',
  'common.selectDate': 'Datum wählen',
  'login.product': 'Unternehmens-Intelligence-App',
  'login.email': 'E-Mail',
  'login.password': 'Passwort',
  'login.enter': 'Empire betreten',
  'login.entering': 'Anmeldung…',
  'login.sessions': 'Sitzungen sind an Vertrag & Rolle gebunden',
  'login.failed': 'Anmeldung fehlgeschlagen',
  'settings.title': 'Einstellungen',
  'settings.subtitle': 'Integrationen, Agent-Konfiguration, Unternehmensidentität und Umgebungs-Setup.',
  'settings.tabIntegrations': 'Integrationen',
  'settings.tabAgent': 'Agent',
  'settings.tabCompany': 'Unternehmen',
  'settings.tabAppearance': 'Darstellung',
  'settings.tabEnvironment': 'Umgebung',
  'settings.language': 'Sprache',
  'settings.languageHint': 'Sprache der Oberfläche. Gilt sofort und bleibt auf diesem Gerät gespeichert. Arabisch schaltet auf Rechts-nach-links um.',
  'settings.textSize': 'Textgröße',
  'settings.textSizeHint': 'Skaliert die gesamte Oberfläche. Gilt sofort und bleibt auf diesem Gerät gespeichert.',
  'settings.currency': 'Währung',
  'settings.currencyHint': 'Symbol in Geldfeldern auf der gesamten Plattform. Bleibt auf diesem Gerät gespeichert.',
  'settings.scaleSmall': 'Klein',
  'settings.scaleMedium': 'Mittel',
  'settings.scaleLarge': 'Groß',
  'settings.scaleSmallHint': 'Dicht — mehr auf dem Bildschirm',
  'settings.scaleMediumHint': 'Standard — ausgewogene Lesegröße',
  'settings.scaleLargeHint': 'Komfort — alles größer',
  'settings.themeNote': 'Dunkles / helles Design wird über das Dock am unteren Bildschirmrand umgeschaltet.',
}

export const MESSAGES: Record<Locale, Record<MsgKey, string>> = { en: EN, ar: AR, nl: NL, zh: ZH, de: DE }

// Module-level mirror so non-React code (formatters in lib/api.ts, the date
// picker's Intl month names) can follow the active language without a hook.
let activeLocale: Locale = 'en'
export function getLocale(): Locale { return activeLocale }
export function getLocaleTag(): string { return LOCALES.find(l => l.code === activeLocale)!.tag }

export function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY)
    if (v && LOCALES.some(l => l.code === v)) return v as Locale
  } catch { /* noop */ }
  return 'en'
}

function applyToDocument(code: Locale) {
  const meta = LOCALES.find(l => l.code === code)!
  document.documentElement.lang = code
  document.documentElement.dir = meta.dir
}

type I18nCtx = { locale: Locale; setLocale: (l: Locale) => void; t: (k: MsgKey) => string }
const Ctx = createContext<I18nCtx>({ locale: 'en', setLocale: () => {}, t: k => EN[k] })

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  useEffect(() => {
    const stored = readStoredLocale()
    activeLocale = stored
    setLocaleState(stored)
    applyToDocument(stored)
  }, [])
  const setLocale = (l: Locale) => {
    activeLocale = l
    setLocaleState(l)
    applyToDocument(l)
    try { localStorage.setItem(LOCALE_KEY, l) } catch { /* noop */ }
  }
  const t = (k: MsgKey) => MESSAGES[locale][k] ?? EN[k] ?? k
  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>
}

export function useI18n() {
  const { locale, setLocale, t } = useContext(Ctx)
  const tag = LOCALES.find(l => l.code === locale)!.tag
  return {
    locale,
    setLocale,
    t,
    tag,
    dir: LOCALES.find(l => l.code === locale)!.dir,
    formatDate: (d: Date | string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) =>
      new Date(d).toLocaleDateString(tag, opts),
    formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(tag, opts).format(n),
    formatCurrency: (n: number, currency = 'EUR') =>
      new Intl.NumberFormat(tag, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n),
  }
}
