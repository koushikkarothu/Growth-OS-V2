'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Trophy, Zap } from 'lucide-react'

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
    if (!confirm('Delete this skill?')) return
    await supabase.from('skills').delete().eq('id', id); fetchSkills()
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Skill Tree</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Visualize your growth and level up your life.</p>
      </header>

      {/* CREATE BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2 mb-10 shadow-sm flex gap-2">
        <input 
          type="text" 
          placeholder="Unlock a new skill (e.g. Design, Spanish, Coding)..."
          className="flex-1 bg-transparent px-6 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none font-medium"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
        />
        <button 
          onClick={addSkill}
          className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white px-8 rounded-2xl font-bold transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Unlock
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map(skill => {
          const progressPercent = Math.min((skill.current_xp / skill.next_level_xp) * 100, 100)
          return (
            <div key={skill.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <button onClick={() => deleteSkill(skill.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center font-bold text-2xl shadow-sm">
                  {skill.level}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{skill.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md w-fit mt-1">
                    <Zap size={12} fill="currentColor" /> {skill.current_xp} XP
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <span>Progress</span>
                  <span>{skill.next_level_xp - skill.current_xp} XP to Lvl {skill.level + 1}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}