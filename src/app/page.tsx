'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  Check, Play, Clock, Flame, MoreVertical, 
  ArrowUpRight, Target, CalendarDays, Loader2, Plus, Zap
} from 'lucide-react'
import CreateTaskModal from '@/components/CreateTaskModal'
import { format, subDays, isSameDay, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'

interface Task {
  id: number; title: string; category: string; frequency_goal: number; time_goal_minutes: number
  last_completed_at: string | null; linked_skill_id: number | null; current_streak: number
  skills?: { name: string }; type: 'Task' | 'Goal'; deadline?: string; current_progress: number
  streak_status?: 'active' | 'warning' | 'broken'
}

export default function Dashboard() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [userRank, setUserRank] = useState('Rookie Scout')
  const [greeting, setGreeting] = useState('Good Morning')
  const [totalXP, setTotalXP] = useState(0)
  
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours < 12) setGreeting('Good Morning')
    else if (hours < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchData()
      fetchProfile()
    }
    init()
  }, [])

  async function fetchProfile() {
    const { data: skills } = await supabase.from('skills').select('current_xp')
    const total = skills?.reduce((sum, skill) => sum + skill.current_xp, 0) || 0
    setTotalXP(total) // <--- Store it in state

    let rank = 'Rookie Scout'
    if (total > 7000) rank = 'Grandmaster'
    else if (total > 3500) rank = 'Commander'
    else if (total > 1500) rank = 'Elite Vanguard'
    else if (total > 500) rank = 'Operator'

    setUserRank(rank)
    
    // Optional: Save to DB so other pages can see it without recalculating
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('profiles').update({ rank_title: rank }).eq('id', user.id)
    }
  }

  async function fetchData() {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }) 
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 })

    // 1. Fetch TASKS
    const { data: tasksData } = await supabase.from('tasks').select('*, skills ( name )').order('created_at', { ascending: false })
    // 2. Fetch GOALS
    const { data: goalsData } = await supabase.from('goals').select('*').eq('deadline', todayStr).neq('status', 'Done')
    // 3. Fetch LOGS (Weekly)
    const { data: logsData } = await supabase.from('task_logs').select('*').gte('date', format(startOfCurrentWeek, 'yyyy-MM-dd')).lte('date', format(endOfCurrentWeek, 'yyyy-MM-dd'))

    const combined: Task[] = []

    if (tasksData) {
      tasksData.forEach((t: any) => {
        // Streak Status Logic
        let status: 'active' | 'warning' | 'broken' = 'active'
        let displayStreak = t.current_streak || 0
        if (t.frequency_goal === 7 && t.last_completed_at) {
          const lastDate = parseISO(t.last_completed_at)
          const yesterday = subDays(today, 1)
          const dayBefore = subDays(today, 2)
          if (isSameDay(lastDate, today) || isSameDay(lastDate, yesterday)) status = 'active'
          else if (isSameDay(lastDate, dayBefore)) { status = 'warning'; displayStreak = Math.max(0, displayStreak - 1) }
          else { status = 'broken'; displayStreak = 0 }
        }

        // --- NEW PROGRESS LOGIC (WEEKLY BUCKET) ---
        let progress = 0
        if (t.time_goal_minutes > 0) {
           // Sum logs for the ENTIRE WEEK, not just today
           progress = logsData?.filter(l => l.task_id === t.id).reduce((sum, curr) => sum + (curr.duration_minutes || 0), 0) || 0
        } else {
           const taskLogs = logsData?.filter(l => l.task_id === t.id) || []
           const uniqueDays = new Set(taskLogs.map(l => l.date)).size
           progress = uniqueDays
        }

        combined.push({
          ...t, type: 'Task', current_progress: progress, streak_status: status, current_streak: displayStreak
        })
      })
    }

    if (goalsData) {
      goalsData.forEach((g: any) => {
        combined.push({
          id: -g.id, title: g.title, category: 'Strategy', frequency_goal: 0, time_goal_minutes: 0,
          last_completed_at: null, linked_skill_id: null, current_streak: 0, type: 'Goal',
          deadline: g.deadline, current_progress: 0
        })
      })
    }
    setTasks(combined)
    setLoading(false)
  }

  // --- LOGIC: ADD TIME (Supports Weekly Bucket + Bonus XP) ---
  async function addTimeQuick(task: Task, minutes: number) {
     const today = new Date().toISOString().split('T')[0]
     const { data: { user } } = await supabase.auth.getUser()

     // 1. Calculate XP (Bonus if already met weekly goal)
     let xp = minutes // Base XP: 1 per minute
     if (task.current_progress >= task.time_goal_minutes) {
        xp = Math.floor(minutes * 1.5) // 1.5x Multiplier for Overachievers!
     }

     // 2. Insert Log
     await supabase.from('task_logs').insert([{ 
        user_id: user?.id, task_id: task.id, date: today, duration_minutes: minutes, xp_earned: xp 
     }])
     
     // 3. Mark "Touched Today" (Moves to bottom)
     // Also Check for Streak Increment: Did this specific log push us over the weekly goal?
     // (We simplify here by just updating streak if weekly goal is met in the future fetch)
     let newStreak = task.current_streak
     if (task.current_progress + minutes >= task.time_goal_minutes && task.current_progress < task.time_goal_minutes) {
        newStreak += 1 // Just crossed the finish line!
     }

     await supabase.from('tasks').update({ last_completed_at: today, current_streak: newStreak }).eq('id', task.id)
     
     if (task.linked_skill_id) await updateSkillXP(task.linked_skill_id, xp)
     fetchData()
  }

  async function deleteTask(id: number) {
    if (!confirm("Delete this mission?")) return
    await supabase.from('task_logs').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    setMenuOpenId(null); fetchData()
  }

  async function toggleComplete(task: Task) {
    if (task.type === 'Goal') {
      await supabase.from('goals').update({ status: 'Done' }).eq('id', Math.abs(task.id))
      fetchData(); return
    }
    const today = new Date().toISOString().split('T')[0]
    const isDoneToday = task.last_completed_at === today
    
    if (isDoneToday) {
      await supabase.from('tasks').update({ last_completed_at: null }).eq('id', task.id)
      await supabase.from('task_logs').delete().match({ task_id: task.id, date: today })
      fetchData(); return
    }

    let newStreak = task.current_streak + 1
    if (task.streak_status === 'broken') newStreak = 1

    await supabase.from('tasks').update({ last_completed_at: today, current_streak: newStreak }).eq('id', task.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('task_logs').insert([{ user_id: user?.id, task_id: task.id, date: today, duration_minutes: 0, xp_earned: 10 }])
    if (task.linked_skill_id) await updateSkillXP(task.linked_skill_id, 10)
    fetchData()
  }

  async function updateSkillXP(skillId: number, amount: number) {
    const { data: skill } = await supabase.from('skills').select('*').eq('id', skillId).single()
    if (!skill) return
    let newXp = skill.current_xp + amount
    let newLevel = skill.level
    let newNextXp = skill.next_level_xp
    if (newXp >= newNextXp) {
      newLevel += 1; newXp = newXp - newNextXp; newNextXp = Math.floor(newNextXp * 1.5)
      alert(`🎉 LEVEL UP! ${skill.name} is now Level ${newLevel}!`)
    }
    await supabase.from('skills').update({ level: newLevel, current_xp: newXp, next_level_xp: newNextXp }).eq('id', skillId)
  }

  // --- SORTING LOGIC ---
  const todayStr = new Date().toISOString().split('T')[0]
  
  // Active = Goals OR Tasks NOT done today
  const activeTasks = tasks.filter(t => {
    if (t.type === 'Goal') return true
    return t.last_completed_at !== todayStr
  })

  // Completed = Tasks done today (Even if weekly goal not fully met, we move them here so you can focus on others)
  const processedTasks = tasks.filter(t => {
    if (t.type === 'Goal') return false
    return t.last_completed_at === todayStr
  })
  
  const activeGoals = tasks.filter(t => t.type === 'Goal')

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTask(null) }} 
        onTaskAdded={fetchData} 
        initialData={editingTask}
      />

      {/* HEADER & STATS (Same as before) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, Commander.</h1>
          <p className="text-slate-500 mt-1 font-medium">Ready to conquer the day?</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays size={18} className="text-indigo-500" />
              {format(new Date(), 'EEEE, MMMM do')}
           </div>
           <button 
             onClick={() => { setEditingTask(null); setIsModalOpen(true) }}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
           >
             <Plus size={18} /> New Mission
           </button>
        </div>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 relative overflow-hidden group">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><Target size={28} /></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Current Rank</p>
          <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900">{userRank}</p>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{totalXP} XP</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500"><Flame size={28} /></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Max Streak</p><p className="text-2xl font-bold text-slate-900">{Math.max(...tasks.map(t => t.current_streak), 0)} Days</p></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500"><Check size={28} /></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Today's Focus</p><p className="text-2xl font-bold text-slate-900">{Math.round((processedTasks.length / (tasks.length || 1)) * 100)}% Done</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COL: ACTIVE --- */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Play size={20} className="text-indigo-600" /> Active Missions
          </h2>

          {activeTasks.length === 0 && !loading && (
            <div className="bg-white border-dashed border-2 border-slate-200 rounded-3xl p-12 text-center">
               <p className="text-slate-400 font-medium">All clear for today. Great work!</p>
            </div>
          )}

          {activeTasks.map(task => (
            <TaskCard key={task.id} task={task} toggleComplete={toggleComplete} addTimeQuick={addTimeQuick} setEditingTask={setEditingTask} setIsModalOpen={setIsModalOpen} deleteTask={deleteTask} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} isProcessed={false} />
          ))}

          {/* --- COMPLETED / LOGGED TODAY --- */}
          {processedTasks.length > 0 && (
             <div className="pt-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1">Completed / Logged Today</h3>
                <div className="space-y-4">
                   {processedTasks.map(task => (
                      <TaskCard key={task.id} task={task} toggleComplete={toggleComplete} addTimeQuick={addTimeQuick} setEditingTask={setEditingTask} setIsModalOpen={setIsModalOpen} deleteTask={deleteTask} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} isProcessed={true} />
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* --- RIGHT COL --- */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Calendar</h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Today</span>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {['M','T','W','T','F','S','S'].map((d, i) => ( <span key={i} className="text-slate-400 font-bold text-xs py-2">{d}</span> ))}
                {Array.from({length: 31}).map((_, i) => (
                  <div key={i} className={cn("h-8 w-8 flex items-center justify-center rounded-full text-slate-600 text-xs", (i+1) === new Date().getDate() ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-50")}>{i+1}</div>
                ))}
             </div>
          </div>

          <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl shadow-indigo-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
             <h3 className="font-bold text-lg mb-1 relative z-10">Weekly Focus</h3>
             <div className="space-y-3 relative z-10 mt-4">
               {activeGoals.length > 0 ? activeGoals.map(g => (
                 <div key={g.id} className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <span className="text-sm font-medium">{g.title}</span><ArrowUpRight size={16} className="text-indigo-300" />
                 </div>
               )) : <div className="text-center py-4 text-indigo-300 text-sm">No strategic goals.</div>}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SUB COMPONENT FOR CLEANER CODE ---
function TaskCard({ task, toggleComplete, addTimeQuick, setEditingTask, setIsModalOpen, deleteTask, menuOpenId, setMenuOpenId, isProcessed }: any) {
  return (
    <div className={cn(
      "group bg-white p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md relative",
      task.type === 'Goal' ? "border-purple-200 bg-purple-50/30" : "border-slate-100",
      task.streak_status === 'warning' && "border-orange-200 bg-orange-50/30",
      isProcessed && "opacity-75 bg-slate-50 hover:opacity-100"
    )}>
      {/* Menu */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><MoreVertical size={18} /></button>
        {menuOpenId === task.id && (
          <div className="absolute right-0 top-8 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
            <button onClick={() => { setEditingTask(task); setIsModalOpen(true); setMenuOpenId(null) }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Edit</button>
            <button onClick={() => deleteTask(task.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">Delete</button>
          </div>
        )}
      </div>

      <div className="flex gap-5">
        <div className="mt-1">
           {task.time_goal_minutes > 0 ? (
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", isProcessed ? "bg-indigo-100 text-indigo-400" : "bg-indigo-50 text-indigo-600")}><Clock size={24} /></div>
           ) : (
              <button onClick={() => toggleComplete(task)} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", task.type === 'Goal' ? "bg-purple-100 text-purple-600" : (isProcessed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600"))}>
                 <Check size={24} />
              </button>
           )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {task.type === 'Goal' && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Goal</span>}
            {task.category && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">{task.category}</span>}
            {task.streak_status === 'warning' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Flame size={10} /> Recovery</span>}
            {isProcessed && task.time_goal_minutes > 0 && <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Logged Today</span>}
          </div>
          
          <h3 className={cn("text-xl font-bold mb-2", isProcessed && task.time_goal_minutes === 0 ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800")}>{task.title}</h3>
          
          <div className="space-y-3">
            {task.time_goal_minutes > 0 && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                  <span className="uppercase tracking-wider">Weekly Progress</span>
                  <span className={cn(task.current_progress >= task.time_goal_minutes ? "text-emerald-500" : "text-indigo-600")}>
                     {task.current_progress} / {task.time_goal_minutes}m {task.current_progress >= task.time_goal_minutes && "🔥"}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", task.current_progress >= task.time_goal_minutes ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${Math.min((task.current_progress / task.time_goal_minutes) * 100, 100)}%` }} />
                </div>
                <div className="flex gap-2 mt-3">
                   <button onClick={() => addTimeQuick(task, 15)} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">+15m</button>
                   <button onClick={() => addTimeQuick(task, 30)} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">+30m</button>
                   <button onClick={() => addTimeQuick(task, 60)} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">+1h</button>
                   {task.current_progress >= task.time_goal_minutes && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1.5 rounded-lg flex items-center gap-1 ml-auto"><Zap size={10} fill="currentColor"/> Bonus XP Active</span>
                   )}
                </div>
              </div>
            )}

            {task.frequency_goal > 0 && task.frequency_goal < 7 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Weekly Goal:</span>
                {Array.from({ length: task.frequency_goal }).map((_, i) => (
                   <div key={i} className={cn("w-3 h-3 rounded-full transition-all", i < task.current_progress ? "bg-indigo-500 scale-110" : "bg-slate-200")} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}