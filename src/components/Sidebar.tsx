'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Map, Play, Target, Compass, Award, LineChart, Globe, Video, Database, RotateCcw, Bot, PenTool, BookOpen, Zap, LogOut, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from './ThemeProvider'

const navGroups = [
  { label: "Execution", links: [{ name: 'Command Center', href: '/', icon: LayoutDashboard }, { name: 'Chrono Map', href: '/chrono', icon: Map }, { name: 'Deep Work', href: '/flow', icon: Play }, { name: 'Strategic Planner', href: '/planner', icon: Target }] },
  { label: "Progression", links: [{ name: 'Roadmap', href: '/roadmap', icon: Compass }, { name: 'Skill Tree', href: '/skills', icon: Award }, { name: 'Analytics', href: '/analytics', icon: LineChart }] },
  { label: "Intelligence", links: [{ name: 'Global Radar', href: '/briefing', icon: Globe }, { name: 'Theater Notes', href: '/theater', icon: Video }, { name: 'Knowledge Vault', href: '/vault', icon: Database }, { name: 'Active Recall', href: '/recall', icon: RotateCcw }] },
  { label: "Training", links: [{ name: 'AI Coach', href: '/coach', icon: Bot }, { name: 'IELTS Forge', href: '/ielts', icon: PenTool }, { name: 'Deep Dive', href: '/learn', icon: BookOpen }] }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-screen fixed left-0 top-0 bottom-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shrink-0">
              <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">Growth<span className="text-indigo-600 dark:text-indigo-400">OS</span></h1>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">System v2.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{group.label}</h3>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const isActive = pathname === link.href
                  const Icon = link.icon
                  return (
                    <Link 
                      key={link.name} href={link.href}
                      className={cn("flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm transition-all",
                        isActive ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                      )}
                    >
                      <Icon size={16} />
                      <span>{link.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <button onClick={toggleTheme} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg font-semibold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg font-semibold text-sm text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <LogOut size={16} /><span>Disconnect</span>
          </button>
        </div>
      </div>
    </aside>
  )
}