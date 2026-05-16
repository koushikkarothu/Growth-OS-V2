'use client'

import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    /* 🎯 THE FIX: bg-slate-50 for light mode, dark:bg-slate-950 for dark */
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 lg:pl-[260px] pb-28 lg:pb-12 pt-4 lg:pt-10 min-h-screen relative overflow-x-hidden">
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-8 lg:px-12 h-full">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}