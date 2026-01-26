'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Trophy, Zap } from 'lucide-react'

interface Skill {
  id: number
  name: string
  level: number
  current_xp: number
  next_level_xp: number
}

export default function SkillTreePage() {
  const router = useRouter()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [newSkillName, setNewSkillName] = useState('')

  // 1. Check Auth & Fetch
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      fetchSkills()
    }
    init()
  }, [])

  async function fetchSkills() {
    const { data } = await supabase
      .from('skills')
      .select('*')
      .order('level', { ascending: false }) // Highest level first
    
    if (data) setSkills(data)
    setLoading(false)
  }

  // 2. Add New Skill
  async function addSkill(e: React.FormEvent) {
    e.preventDefault()
    if (!newSkillName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()

    const newSkill = {
      user_id: user?.id,
      name: newSkillName,
      level: 1,
      current_xp: 0,
      next_level_xp: 100
    }

    // Optimistic Update
    const tempId = Math.random()
    setSkills([...skills, { ...newSkill, id: tempId } as Skill])
    setNewSkillName('')

    const { error } = await supabase.from('skills').insert([newSkill])
    if (error) {
      alert('Error creating skill')
      fetchSkills()
    } else {
      fetchSkills()
    }
  }

  // 3. Delete Skill
  async function deleteSkill(id: number) {
    if (!confirm('Are you sure? This will delete all progress for this skill.')) return
    
    setSkills(skills.filter(s => s.id !== id))
    await supabase.from('skills').delete().eq('id', id)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">🌳 Skill Tree</h1>
        <p className="text-gray-400">"Visualizing your growth, one level at a time."</p>
      </header>

      {/* CREATE SKILL BAR */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-10">
        <form onSubmit={addSkill} className="flex gap-3">
          <input 
            type="text" 
            placeholder="Name a new skill (e.g. Python, Calisthenics, Design)..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
          />
          <button 
            type="submit"
            className="bg-teal-600 hover:bg-teal-500 text-white px-6 rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Unlock Skill
          </button>
        </form>
      </div>

      {/* SKILL GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {skills.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
            <Trophy className="mx-auto text-gray-600 mb-3" size={48} />
            <p className="text-gray-500">No skills unlocked yet.</p>
          </div>
        )}

        {skills.map(skill => {
          const progressPercent = Math.min((skill.current_xp / skill.next_level_xp) * 100, 100)
          
          return (
            <div key={skill.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative group hover:border-teal-500/30 transition-all">
              
              {/* Delete Button (Hidden until hover) */}
              <button 
                onClick={() => deleteSkill(skill.id)}
                className="absolute top-4 right-4 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xl">
                  {skill.level}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{skill.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-teal-400 font-medium">
                    <Zap size={12} fill="currentColor" />
                    <span>{skill.current_xp} XP</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>Progress</span>
                  <span>{skill.next_level_xp - skill.current_xp} XP to next lvl</span>
                </div>
                <div className="h-3 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                  <div 
                    className="h-full bg-linear-to-r from-teal-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}