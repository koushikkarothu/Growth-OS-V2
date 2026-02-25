'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  LayoutGrid, Calendar, Trophy, Zap, Brain,
  BarChart2, Book, BrainCircuit, Settings, LogOut, Mic, PlaySquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Map } from 'lucide-react' // Add Map to imports

const menuItems = [
  { name: 'Dashboard', icon: LayoutGrid, href: '/' },
  { name: 'Master Plan', icon: Map, href: '/roadmap' }, // <--- ADDED HERE
  { name: 'Deep Work', icon: Brain, href: '/flow' }, // <--- ADD THIS
  { name: 'Planner', icon: Calendar, href: '/planner' },
  { name: 'Skill Tree', icon: Trophy, href: '/skills' },
  { name: 'Learning Theater', icon: PlaySquare, href: '/theater' }, // <--- ADDED HERE
  { name: 'Active Recall', icon: Zap, href: '/recall' },
  { name: 'Analytics', icon: BarChart2, href: '/analytics' },
  { name: 'Knowledge Vault', icon: Book, href: '/vault' },
  { name: 'Daily Learn', icon: BrainCircuit, href: '/learn' },
  { name: 'AI Coach', icon: Mic, href: '/coach' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    // "hidden md:flex" -> Hides on mobile, Flex on Desktop
    // "dark:bg-slate-900" -> Dark mode background
    <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen fixed left-0 top-0 p-6 flex-col z-50">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20">
          G
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Growth OS</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">v2.0 Pro</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar"> 
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                isActive 
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <item.icon size={20} className={cn("transition-colors", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
              {item.name}
              {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-l-full" />}
            </Link>
          )
        })}
      </nav>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-2">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all font-medium text-sm">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}