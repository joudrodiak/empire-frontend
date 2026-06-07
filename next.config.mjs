import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const staticExport = process.env.STATIC_EXPORT === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: staticExport ? 'export' : 'standalone',
  outputFileTracingRoot: root,
  images: { unoptimized: staticExport },
  ...(!staticExport && {
    async rewrites() {
      const apiOrigin = process.env.INTERNAL_API_URL
        || process.env.NEXT_PUBLIC_API_URL
        || 'http://localhost:4000'
      return [
        {
          source: '/api/:path*',
          destination: `${apiOrigin.replace(/\/$/, '')}/api/:path*`,
        },
      ]
    },
  }),
}

export default nextConfig
