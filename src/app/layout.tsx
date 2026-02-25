'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 flex flex-col md:flex-row min-h-screen overflow-hidden`}>
        
        {/* 1. DESKTOP SIDEBAR WRAPPER */}
        {/* Added md:w-72 to force the original spacing */}
        {!isAuthPage && (
          <div className="hidden md:block flex-shrink-0 md:w-72">
             <div className="fixed top-0 left-0 h-full w-72">
                <Sidebar />
             </div>
          </div>
        )}

        {/* 2. MAIN CONTENT AREA */}
        <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative">
           <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
              {children}
           </div>
        </main>

        {/* 3. MOBILE NAVIGATION */}
        {!isAuthPage && <MobileNav />}
        
      </body>
    </html>
  )
}