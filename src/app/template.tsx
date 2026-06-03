'use client'

import { usePathname } from 'next/navigation'

/**
 * Root template — re-mounts on every navigation (unlike layout.tsx), so it is
 * the App Router hook for page-to-page enter animations. Keying on the pathname
 * forces the wrapper to remount when moving left↔right between units too, giving
 * each route a smooth fade + lift instead of a hard cut. CSS-only (no motion
 * library) to stay dependency-free and fast.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-page-enter motion-reduce:animate-none">
      {children}
    </div>
  )
}
