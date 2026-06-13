import type { Metadata } from 'next'
import './globals.css'
import '@aejkatappaja/phantom-ui/ssr.css'
import { DockNav } from '@/components/templates/DockNav'
import { AuthProvider } from '@/lib/auth'
import { I18nProvider } from '@/lib/i18n'
import { AuthGate } from '@/components/templates/AuthGate'
import { ReleaseNotesModal } from '@/components/templates/ReleaseNotesModal'
import { EmpireCursor } from '@/components/atoms/EmpireCursor'

export const metadata: Metadata = {
  title: 'Empire',
  description: 'Company intelligence app for mapping units, people, documents and agent context.',
}

// Set the theme + text-scale classes before first paint to avoid a flash. Reads
// the persisted choices (empire-os-theme / empire-os-text-scale), falling back
// to the system preference for theme and "medium" for text scale.
const themeBoot = `(function(){try{var t=localStorage.getItem('empire-os-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);var s=localStorage.getItem('empire-os-text-scale');if(s!=='small'&&s!=='large'){s='medium';}r.classList.remove('text-scale-small','text-scale-medium','text-scale-large');r.classList.add('text-scale-'+s);var l=localStorage.getItem('empire-os-locale');if(['en','ar','nl','zh','de'].indexOf(l)<0){l='en';}r.lang=l;r.dir=l==='ar'?'rtl':'ltr';}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="bg-empire-void min-h-screen">
        <I18nProvider>
          <AuthProvider>
            <AuthGate>
              {/* pb leaves room for the floating bottom dock */}
              <div className="pb-28">{children}</div>
              <DockNav />
              <ReleaseNotesModal />
              <EmpireCursor />
            </AuthGate>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
