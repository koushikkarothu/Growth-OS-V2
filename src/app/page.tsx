'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Plus, Trophy, Flame, Settings2 } from 'lucide-react'
import CreateTaskModal from '@/components/CreateTaskModal'

interface Task {
  id: number
  title: string
  category: string
  frequency_goal: number
  time_goal_minutes: number
  last_completed_at: string | null 
  linked_skill_id: number | null // We need this now!
}

export default function Dashboard() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userRank, setUserRank] = useState('Rookie Scout')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        fetchTasks()
        fetchProfile()
      }
    }
    init()
  }, [])

  async function fetchProfile() {
    // Basic profile fetch (we can expand this later to show real rank)
    const { data } = await supabase.from('profiles').select('rank_title').single()
    if (data) setUserRank(data.rank_title)
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setTasks(data)
    setLoading(false)
  }

  // --- 🌟 THE NEW XP LOGIC ---
  async function updateSkillXP(skillId: number, amount: number) {
    // 1. Get current skill data
    const { data: skill } = await supabase
      .from('skills')
      .select('*')
      .eq('id', skillId)
      .single()

    if (!skill) return

    let newXp = skill.current_xp + amount
    let newLevel = skill.level
    let newNextXp = skill.next_level_xp

    // 2. Level Up Check!
    if (newXp >= newNextXp) {
      newLevel += 1
      newXp = newXp - newNextXp // Carry over excess XP
      newNextXp = Math.floor(newNextXp * 1.5) // Harder to get to next level
      alert(`🎉 LEVEL UP! Your ${skill.name} skill is now Level ${newLevel}!`)
    }

    // 3. Prevent negative XP (if unchecking)
    if (newXp < 0) newXp = 0

    // 4. Save to DB
    await supabase
      .from('skills')
      .update({ 
        level: newLevel, 
        current_xp: newXp, 
        next_level_xp: newNextXp 
      })
      .eq('id', skillId)
  }

  async function toggleTask(task: Task) {
    const today = new Date().toISOString().split('T')[0]
    const isDoneToday = task.last_completed_at === today
    
    // Determine Action: Are we completing (doing) or undoing?
    const isCompleting = !isDoneToday
    const newDate = isCompleting ? today : null

    // 1. Optimistic UI Update
    setTasks(currentTasks => 
      currentTasks.map(t => t.id === task.id ? { ...t, last_completed_at: newDate } : t)
    )

    // 2. Database Update
    await supabase.from('tasks').update({ last_completed_at: newDate }).eq('id', task.id)

    // 🌟 ADD THIS: Create History Log if completing
    if (isCompleting) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('task_logs').insert([{
        user_id: user?.id,
        task_id: task.id,
        date: today,
        duration_minutes: task.time_goal_minutes > 0 ? (task.time_goal_minutes / task.frequency_goal) : 0,
        xp_earned: 10 // or calculate dynamically
      }])
    }
    
    // 3. Handle XP (If task has a linked skill)
    if (task.linked_skill_id) {
      // Calculate XP: 10 for normal tasks, or 1 XP per minute for time tasks
      let xpAmount = 10
      if (task.time_goal_minutes > 0) {
        xpAmount = Math.floor(task.time_goal_minutes / task.frequency_goal) // Rough estimate per session
        if (xpAmount === Infinity || isNaN(xpAmount)) xpAmount = 30 // Fallback
      }

      // If undoing, we subtract XP (multiply by -1)
      const finalXp = isCompleting ? xpAmount : -xpAmount
      await updateSkillXP(task.linked_skill_id, finalXp)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const activeTasks = tasks.filter(t => t.last_completed_at !== today)
  const completedTasks = tasks.filter(t => t.last_completed_at === today)

  return (
    <div className="max-w-4xl mx-auto">
      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onTaskAdded={fetchTasks} 
      />

      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">🔥 Command Center</h1>
        <p className="text-gray-400">"Discipline is choosing between what you want now and what you want most."</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-yellow-500" size={20} />
            <h3 className="text-gray-300 font-medium">Rank</h3>
          </div>
          <p className="text-2xl font-bold text-white">{userRank}</p>
        </div>
        <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="text-orange-500" size={20} />
            <h3 className="text-gray-300 font-medium">Streak</h3>
          </div>
          <p className="text-2xl font-bold text-white">0 Days</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">📝 Active Missions</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-lg shadow-teal-900/20"
          >
            <Plus size={16} />
            Quick Add
          </button>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-dashed border-gray-700">
              <p className="text-gray-500">No active missions. Create one to start!</p>
            </div>
          )}

          {activeTasks.map(task => (
            <div key={task.id} className="group flex items-center justify-between bg-gray-800/40 p-4 rounded-xl border border-gray-800 hover:border-teal-500/30 hover:bg-gray-800/60 transition-all duration-300">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleTask(task)}
                  className="text-gray-500 hover:text-teal-400 transition-transform active:scale-90"
                >
                  <Circle size={24} strokeWidth={1.5} />
                </button>
                <div>
                  <h3 className="text-lg font-medium text-gray-200">{task.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20">
                      {task.category}
                    </span>
                    <span className="text-xs bg-gray-700/30 text-gray-400 px-2 py-0.5 rounded border border-gray-700/50">
                      {task.time_goal_minutes > 0 
                        ? `⏱️ ${task.time_goal_minutes / 60}h / Wk`
                        : `🔄 ${task.frequency_goal}x / Wk`
                      }
                    </span>
                  </div>
                </div>
              </div>
              <button className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <Settings2 size={18} />
              </button>
            </div>
          ))}

          {completedTasks.length > 0 && (
            <div className="pt-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 pl-2">Completed Today</h3>
              <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                {completedTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-4 bg-gray-900/30 rounded-xl border border-gray-800/50">
                    <button 
                      onClick={() => toggleTask(task)}
                      className="text-teal-500 hover:text-red-400 transition-colors"
                    >
                      <CheckCircle2 size={24} />
                    </button>
                    <span className="text-gray-500 line-through decoration-gray-700">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}