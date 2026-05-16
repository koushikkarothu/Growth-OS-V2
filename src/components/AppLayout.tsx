'use client'

import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex selection:bg-indigo-500/30">
      <Sidebar />
      {/* 🎯 THE FIX: lg:pl-[280px] perfectly offsets the new 280px Desktop Sidebar */}
      <main className="flex-1 lg:pl-[280px] pb-28 lg:pb-12 pt-4 lg:pt-10 min-h-screen relative overflow-x-hidden">
        {/* 🎯 THE FIX: Expanded to 1920px for edge-to-edge fluid distribution */}
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-8 lg:px-12 h-full">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}