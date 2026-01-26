'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { usePathname } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Define pages where sidebar should NOT appear
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.className} bg-slate-50 text-slate-900 flex`}>
        
        {/* Only show Sidebar if NOT on an auth page */}
        {!isAuthPage && <Sidebar />}
        
        {/* If sidebar is present, push content 72 units to the right (ml-72).
            If hidden (auth page), use full width (w-full).
        */}
        <main className={isAuthPage ? "w-full h-screen overflow-auto" : "flex-1 ml-72 p-8 h-screen overflow-y-auto"}>
          {children}
        </main>

      </body>
    </html>
  )
}