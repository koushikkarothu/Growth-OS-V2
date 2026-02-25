'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutGrid, Calendar, Trophy, Zap, PlaySquare, Brain,
  BarChart2, Book, BrainCircuit, Mic, Menu, X 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Map } from 'lucide-react' // Add Map to imports

// 1. Define ALL items here
const allItems = [
  { name: 'Dashboard', icon: LayoutGrid, href: '/' },
  { name: 'Master Plan', icon: Map, href: '/roadmap' }, // <--- ADDED HERE
  { name: 'Deep Work', icon: Brain, href: '/flow' }, // <--- ADD THIS
  { name: 'Planner', icon: Calendar, href: '/planner' },
  { name: 'Skill Tree', icon: Trophy, href: '/skills' },
  { name: 'Learning Theater', icon: PlaySquare, href: '/theater' }, // <--- ADDED HERE
  { name: 'AI Coach', icon: Mic, href: '/coach' },
  { name: 'Daily Learn', icon: BrainCircuit, href: '/learn' },
  { name: 'Active Recall', icon: Zap, href: '/recall' },
  { name: 'Analytics', icon: BarChart2, href: '/analytics' },
  { name: 'Knowledge Vault', icon: Book, href: '/vault' },
]

// 2. Pick the "Top 4" for the bottom bar
const bottomBarItems = allItems.slice(0, 4)

export default function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* --- THE DRAWER (FULL MENU) --- */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-950 p-6 animate-in slide-in-from-bottom-10 duration-200 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xl font-bold text-slate-900 dark:text-white">Menu</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-20">
            {allItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all",
                    isActive 
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400" 
                      : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                  )}
                >
                  <item.icon size={24} />
                  <span className="text-xs font-bold">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* --- THE BOTTOM BAR --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 md:hidden pb-safe">
        <div className="flex justify-around items-center h-16">
          {/* Render Top 4 Items */}
          {bottomBarItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  isActive 
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" 
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <item.icon size={24} />
              </Link>
            )
          })}

          {/* Render "Menu" Button (Triggers Drawer) */}
          <button 
            onClick={() => setIsOpen(true)}
            className={cn(
              "p-3 rounded-xl transition-all",
              isOpen 
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" 
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>
    </>
  )
}