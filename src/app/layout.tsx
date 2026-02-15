'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav' // Import the new bar
import { usePathname } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <html lang="en" suppressHydrationWarning>
      {/* 1. suppressHydrationWarning: Fixes the red console errors 
         2. dark:bg-slate-950: Sets the dark background color 
      */}
      <body suppressHydrationWarning className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 flex flex-col md:flex-row`}>
        
        {/* Desktop Sidebar (Hidden on Mobile) */}
        {!isAuthPage && <Sidebar />}
        
        {/* Mobile Nav (Hidden on Desktop) */}
        {!isAuthPage && <MobileNav />}
        
        {/* Main Content Logic:
           - md:ml-72 -> On desktop, push content right to make room for sidebar
           - mb-20 -> On mobile, push content up to make room for bottom bar
        */}
        <main className={isAuthPage 
          ? "w-full h-screen overflow-auto" 
          : "flex-1 w-full md:ml-72 p-4 md:p-8 min-h-screen overflow-y-auto mb-20 md:mb-0 transition-all duration-300"
        }>
          {children}
        </main>

      </body>
    </html>
  )
}