'use client'

import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname } from 'next/navigation'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      
      {/* 1. DESKTOP SIDEBAR WRAPPER */}
      {!isAuthPage && (
        <div className="hidden md:block flex-shrink-0 md:w-72">
           <div className="fixed top-0 left-0 h-full w-72 z-50">
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
      
    </div>
  )
}