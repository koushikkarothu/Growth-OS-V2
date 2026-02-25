'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      {!isAuthPage && (
        <div className="hidden md:block">
          <Sidebar />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="p-4 md:p-8 lg:p-10 max-w-screen-2xl mx-auto">
           {children}
        </div>
      </main>

      {/* Mobile Nav (Hidden on Desktop) */}
      {!isAuthPage && <MobileNav />}
    </div>
  )
}