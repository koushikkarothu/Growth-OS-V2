'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Award, Zap, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Skill {
  id: number; name: string; level: number; current_xp: number; next_level_xp: number
}

export default function SkillTreePage() {
  const router = useRouter()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [newSkillName, setNewSkillName] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchSkills()
    }
    init()
  }, [])

  async function fetchSkills() {
    const { data } = await supabase.from('skills').select('*').order('level', { ascending: false })
    if (data) setSkills(data)
    setLoading(false)
  }

  async function addSkill(e: React.FormEvent) {
    e.preventDefault(); if (!newSkillName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('skills').insert([{ user_id: user?.id, name: newSkillName, level: 1, current_xp: 0, next_level_xp: 100 }])
    setNewSkillName(''); fetchSkills()
  }

  async function deleteSkill(id: number) {
    if (!confirm('Delete this skill branch?')) return
    await supabase.from('skills').delete().eq('id', id); fetchSkills()
  }

  return (
    <div className="w-full pb-32 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
             <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20"><Award className="text-indigo-600 dark:text-indigo-400" size={24} /></div>
             Skill Tree
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-sm">Visualize your growth and unlock new domains.</p>
        </div>
      </header>

      {/* CREATE BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 mb-10 shadow-sm flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center px-4">
            <ChevronRight size={18} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Initialize a new skill branch (e.g. Finance, Coding)..."
              className="w-full bg-transparent py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
            />
        </div>
        <button 
          onClick={addSkill}
          disabled={!newSkillName.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 sm:py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
        >
          <Plus size={16} /> Unlock Branch
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {skills.map(skill => {
          const progressPercent = Math.min((skill.current_xp / skill.next_level_xp) * 100, 100)
          return (
            <div key={skill.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm">
              <button 
                onClick={() => deleteSkill(skill.id)} 
                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-colors p-1"
                title="Delete Skill"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
                  {skill.level}
                </div>
                <div className="min-w-0 pr-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{skill.name}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                    <Zap size={10} className="text-amber-500" fill="currentColor" /> {skill.current_xp} XP Total
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Progress</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{skill.next_level_xp - skill.current_xp} XP to Lvl {skill.level + 1}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          )
        })}

        {skills.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <Award className="mx-auto text-slate-400 mb-3" size={32} />
            <p className="text-slate-900 dark:text-white font-bold text-lg mb-1">No skill branches unlocked.</p>
            <p className="text-slate-500 text-sm">Initialize a new skill to track your progression.</p>
          </div>
        )}
      </div>
    </div>
  )
}