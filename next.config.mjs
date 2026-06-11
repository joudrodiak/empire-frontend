import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const staticExport = process.env.STATIC_EXPORT === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: staticExport ? 'export' : 'standalone',
  outputFileTracingRoot: root,
  images: { unoptimized: staticExport },
  // Local dev runs in docker and is browsed via 127.0.0.1:3001; without this
  // Next blocks its own dev resources (HMR, RSC payloads) as cross-origin and
  // the app silently never hydrates — eternal loading splash.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
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
