'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Map, Play, Target, 
  Compass, Award, LineChart, 
  Globe, Video, Database, RotateCcw, 
  Bot, PenTool, BookOpen, 
  Zap, LogOut 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

const navGroups = [
  {
    label: "Execution",
    links: [
      { name: 'Command Center', href: '/', icon: LayoutDashboard },
      { name: 'Chrono Map', href: '/chrono', icon: Map },
      { name: 'Deep Work', href: '/flow', icon: Play },
      { name: 'Strategic Planner', href: '/planner', icon: Target },
    ]
  },
  {
    label: "Progression",
    links: [
      { name: 'Roadmap', href: '/roadmap', icon: Compass },
      { name: 'Skill Tree', href: '/skills', icon: Award },
      { name: 'Analytics', href: '/analytics', icon: LineChart },
    ]
  },
  {
    label: "Intelligence",
    links: [
      { name: 'Global Radar', href: '/briefing', icon: Globe },
      { name: 'Theater Notes', href: '/theater', icon: Video },
      { name: 'Knowledge Vault', href: '/vault', icon: Database },
      { name: 'Active Recall', href: '/recall', icon: RotateCcw },
    ]
  },
  {
    label: "Training",
    links: [
      { name: 'AI Coach', href: '/coach', icon: Bot },
      { name: 'IELTS Forge', href: '/ielts', icon: PenTool },
      { name: 'Deep Dive', href: '/learn', icon: BookOpen },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-screen fixed left-0 top-0 bottom-0 p-5 z-50">
      <div className="flex-1 flex flex-col bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden">
        
        {/* LOGO */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Zap size={20} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-none">Growth<span className="text-indigo-400">OS</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">System v2.0</p>
            </div>
          </div>
        </div>

        {/* NAV LINKS */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{group.label}</h3>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const isActive = pathname === link.href
                  const Icon = link.icon
                  return (
                    <Link 
                      key={link.name} 
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 group",
                        isActive 
                          ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-inner" 
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
                      )}
                    >
                      <Icon size={16} className={cn("transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                      <span>{link.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Disconnect</span>
          </button>
        </div>

      </div>
    </aside>
  )
}