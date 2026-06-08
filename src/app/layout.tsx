import type { Metadata } from 'next'
import './globals.css'
import '@aejkatappaja/phantom-ui/ssr.css'
import { DockNav } from '@/components/templates/DockNav'
import { AuthProvider } from '@/lib/auth'
import { AuthGate } from '@/components/templates/AuthGate'

export const metadata: Metadata = {
  title: 'Empire OS - Company intelligence app',
  description: 'Company intelligence app for mapping units, people, documents and agent context.',
}

// Set the theme class before first paint to avoid a flash. Reads the persisted
// choice (empire-os-theme), falling back to the system preference, else dark.
const themeBoot = `(function(){try{var t=localStorage.getItem('empire-os-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="bg-empire-void min-h-screen">
        <AuthProvider>
          <AuthGate>
            {/* pb leaves room for the floating bottom dock */}
            <div className="pb-28">{children}</div>
            <DockNav />
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
