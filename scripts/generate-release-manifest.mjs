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
  // A2: keep release notes end-user friendly — drop developer-only lines and
  // strip conventional-commit / merge noise so operators read plain language.
  const dropLine = /^(merge|revert|bump|chore|ci|build|docs|refactor|test|style|wip)\b|co-authored-by|signed-off-by|^\* |[0-9a-f]{7,40}$/i
  const cleaned = text
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*#\s]+/, '').trim())
    .map(line => line.replace(/^(feat|fix|perf|feature)(\([^)]*\))?:\s*/i, '')) // strip commit-type prefix
    .map(line => line.replace(/\(#\d+\)\s*$/, '').trim()) // drop trailing PR refs
    .filter(Boolean)
    .filter(line => !dropLine.test(line))
    .map(line => line.charAt(0).toUpperCase() + line.slice(1)) // sentence-case
    .slice(0, 12)
  return cleaned.length ? cleaned : fallback
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
