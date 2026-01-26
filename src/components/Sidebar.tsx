'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Trophy, 
  Zap, 
  BarChart3, 
  BookOpen,
  Settings 
} from 'lucide-react'
import { cn } from '@/lib/utils' // We'll create this helper next!

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Planner', icon: CalendarCheck, href: '/planner' },
  { name: 'Skill Tree', icon: Trophy, href: '/skills' },
  { name: 'Active Recall', icon: Zap, href: '/recall' },
  { name: 'Analytics', icon: BarChart3, href: '/analytics' },
  { name: 'Knowledge Vault', icon: BookOpen, href: '/vault' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 h-screen fixed left-0 top-0 p-4 flex flex-col">
      {/* Logo Area */}
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold">
          🚀
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Growth OS</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-teal-500/10 text-teal-400" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Profile / Settings */}
      <div className="pt-4 border-t border-gray-800">
        <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </aside>
  )
}