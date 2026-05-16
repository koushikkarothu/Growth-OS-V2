'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Map, Play, Target, Compass, Award, LineChart, Globe, Video, Database, RotateCcw, Bot, PenTool, BookOpen, Menu, X, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from './ThemeProvider'

const mainLinks = [
  { name: 'Command', href: '/', icon: LayoutDashboard },
  { name: 'Chrono', href: '/chrono', icon: Map },
  { name: 'Flow', href: '/flow', icon: Play },
  { name: 'Vault', href: '/vault', icon: Database },
]

const navGroups = [
  { label: "Execution", links: [{ name: 'Command Center', href: '/', icon: LayoutDashboard }, { name: 'Chrono Map', href: '/chrono', icon: Map }, { name: 'Deep Work', href: '/flow', icon: Play }, { name: 'Planner', href: '/planner', icon: Target }] },
  { label: "Progression", links: [{ name: 'Roadmap', href: '/roadmap', icon: Compass }, { name: 'Skill Tree', href: '/skills', icon: Award }, { name: 'Analytics', href: '/analytics', icon: LineChart }] },
  { label: "Intelligence", links: [{ name: 'Global Radar', href: '/briefing', icon: Globe }, { name: 'Theater Notes', href: '/theater', icon: Video }, { name: 'Vault', href: '/vault', icon: Database }, { name: 'Active Recall', href: '/recall', icon: RotateCcw }] },
  { label: "Training", links: [{ name: 'AI Coach', href: '/coach', icon: Bot }, { name: 'IELTS Forge', href: '/ielts', icon: PenTool }, { name: 'Deep Dive', href: '/learn', icon: BookOpen }] }
]

export default function MobileNav() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isMenuOpen])

  return (
    <>
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-[60]">
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-2 flex items-center justify-between">
          
          {mainLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link 
                key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex flex-col items-center justify-center w-[18vw] max-w-[70px] h-14 rounded-[1.2rem] transition-all relative",
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {isActive && <motion.div layoutId="mobile-bubble" className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/20 rounded-[1.2rem] border border-indigo-100 dark:border-indigo-500/30" />}
                <Icon size={20} className="relative z-10 mb-1" />
                <span className="text-[9px] font-black uppercase tracking-widest relative z-10">{link.name}</span>
              </Link>
            )
          })}

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex flex-col items-center justify-center w-[18vw] max-w-[70px] h-14 rounded-[1.2rem] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all bg-slate-100 dark:bg-white/5"
          >
            {isMenuOpen ? <X size={20} className="mb-1" /> : <Menu size={20} className="mb-1" />}
            <span className="text-[9px] font-black uppercase tracking-widest">Menu</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[50]"
              onClick={() => setIsMenuOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed bottom-24 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-[55] overflow-hidden max-h-[70vh] flex flex-col"
            >
              <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                <button onClick={() => {toggleTheme(); setIsMenuOpen(false)}} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors">
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
                </button>

                {navGroups.map((group, idx) => (
                  <div key={idx}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 pl-2 border-l-2 border-indigo-500/30">{group.label}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {group.links.map((link) => {
                        const isActive = pathname === link.href
                        const Icon = link.icon
                        return (
                          <Link 
                            key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-xs transition-all",
                              isActive ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30" : "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                            )}
                          >
                            <Icon size={16} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"} />
                            <span className="truncate">{link.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}