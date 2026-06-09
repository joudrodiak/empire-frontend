import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

function eventPayload() {
  const path = process.env.GITHUB_EVENT_PATH
  if (!path) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

function cleanNotes(input) {
  const fallback = [
    'Production deployment pipeline now publishes the live site from main and published releases.',
    'Release updates are shown after login so operators see what changed before they start work.',
    'Education guides now focus on step-by-step unit and feature workflows.',
  ]
  const text = String(input || '').trim()
  if (!text) return fallback
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*#\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 12)
}

const event = eventPayload()
const release = event.release || {}
const version = String(release.tag_name || process.env.RELEASE_VERSION || `v${pkg.version}`)
const notes = cleanNotes(release.body || process.env.RELEASE_NOTES)
const sha = process.env.GITHUB_SHA || 'local'
const branch = process.env.GITHUB_REF_NAME || 'local'
const publishedAt = release.published_at || release.created_at || new Date().toISOString()

const manifest = {
  version,
  appVersion: pkg.version,
  title: release.name || `Empire OS ${version}`,
  notes,
  sha,
  branch,
  source: release.html_url || '',
  publishedAt,
}

const out = join(root, 'public', 'release.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${out} for ${version}`)
