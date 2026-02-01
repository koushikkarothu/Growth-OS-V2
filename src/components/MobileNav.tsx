'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Calendar, Trophy, BrainCircuit, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

// We pick the Top 5 most important tabs for mobile
const menuItems = [
  { icon: LayoutGrid, href: '/' },
  { icon: Calendar, href: '/planner' },
  { icon: Trophy, href: '/skills' },
  { icon: Mic, href: '/coach' }, 
  { icon: BrainCircuit, href: '/learn' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
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
      </div>
    </div>
  )
}