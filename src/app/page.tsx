'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Check, Play, Clock, Flame, MoreVertical, ArrowUpRight, Target, CalendarDays, Plus, Command, CheckCircle2, PowerOff } from 'lucide-react'
import CreateTaskModal from '@/components/CreateTaskModal'
import BodyTracker from '@/components/BodyTracker'
import RecoveryMatrix from '@/components/RecoveryMatrix'
import { format, parseISO, differenceInCalendarDays, startOfWeek, endOfWeek, startOfMonth, getDaysInMonth, getDay } from 'date-fns'
import { cn } from '@/lib/utils'
import NotificationManager from '@/components/NotificationManager'

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
  const [totalXP, setTotalXP] = useState(0)
  const [greeting, setGreeting] = useState('Good Morning')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setEditingTask(null); setIsModalOpen(true) }
    }
    document.addEventListener('keydown', down); return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours < 12) setGreeting('Good Morning')
    else if (hours < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchData(); fetchProfile(user.id)
    }
    init()
  }, [])

  async function fetchProfile(userId: string) {
    const { data: logs } = await supabase.from('task_logs').select('xp_earned').eq('user_id', userId)
    const lifetimeXP = logs?.reduce((sum, log) => sum + (log.xp_earned || 0), 0) || 0
    setTotalXP(lifetimeXP)
    let rank = 'Rookie Scout'
    if (lifetimeXP > 10000) rank = 'Grandmaster'
    else if (lifetimeXP > 5000) rank = 'Commander'
    else if (lifetimeXP > 2000) rank = 'Elite Vanguard'
    else if (lifetimeXP > 500) rank = 'Operator'
    setUserRank(rank)
  }

  async function fetchData() {
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }) 
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 })

    const { data: tasksData } = await supabase.from('tasks').select('*, skills ( name )').order('created_at', { ascending: false })
    const { data: goalsData } = await supabase.from('goals').select('*').eq('deadline', todayStr).neq('status', 'Done')
    const { data: logsData } = await supabase.from('task_logs').select('*').gte('date', format(startOfCurrentWeek, 'yyyy-MM-dd')).lte('date', format(endOfCurrentWeek, 'yyyy-MM-dd'))

    const combined: Task[] = []

    if (tasksData) {
      tasksData.forEach((t: any) => {
        let calculatedStreak = t.current_streak
        let status: 'active' | 'warning' | 'broken' = 'active'
        
        if (!t.last_completed_at) { calculatedStreak = 0; status = 'broken' } 
        else {
            const lastDate = parseISO(t.last_completed_at)
            const diff = differenceInCalendarDays(today, lastDate)
            if (t.frequency_goal === 7) {
                if (diff === 0 || diff === 1) status = 'active'
                else if (diff === 2) status = 'warning'
                else { status = 'broken'; calculatedStreak = 0 }
            } else { if (diff > 8) { status = 'broken'; calculatedStreak = 0 } }
        }

        let progress = 0
        if (t.time_goal_minutes > 0) progress = logsData?.filter(l => l.task_id === t.id).reduce((sum, curr) => sum + (curr.duration_minutes || 0), 0) || 0
        else progress = new Set((logsData?.filter(l => l.task_id === t.id) || []).map(l => l.date)).size
        combined.push({ ...t, type: 'Task', current_progress: progress, streak_status: status, current_streak: calculatedStreak })
      })
    }

    if (goalsData) {
      goalsData.forEach((g: any) => { combined.push({ id: -g.id, title: g.title, category: 'Strategy', frequency_goal: 0, time_goal_minutes: 0, last_completed_at: null, linked_skill_id: null, current_streak: 0, type: 'Goal', deadline: g.deadline, current_progress: 0 }) })
    }
    setTasks(combined); setLoading(false)
  }

  const triggerConfetti = () => { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#a855f7', '#ec4899'] }) }

  async function addTimeQuick(task: Task, minutes: number) {
     const today = new Date().toISOString().split('T')[0]
     const { data: { user } } = await supabase.auth.getUser()
     if(!user) return
     let xp = minutes 
     if (task.current_progress >= task.time_goal_minutes) xp = Math.floor(minutes * 1.5)
     
     await supabase.from('task_logs').insert([{ user_id: user.id, task_id: task.id, date: today, duration_minutes: minutes, xp_earned: xp }])
     let newStreak = task.current_streak
     if (task.current_progress + minutes >= task.time_goal_minutes && task.current_progress < task.time_goal_minutes) { newStreak += 1; triggerConfetti() }

     await supabase.from('tasks').update({ last_completed_at: today, current_streak: newStreak }).eq('id', task.id)
     if (task.linked_skill_id) await updateSkillXP(task.linked_skill_id, xp)
     fetchData(); fetchProfile(user.id)
  }

  async function toggleComplete(task: Task) {
    if (task.type === 'Goal') { await supabase.from('goals').update({ status: 'Done' }).eq('id', Math.abs(task.id)); triggerConfetti(); fetchData(); return }
    const today = new Date().toISOString().split('T')[0]
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    if (task.last_completed_at === today) {
      await supabase.from('tasks').update({ last_completed_at: null }).eq('id', task.id)
      await supabase.from('task_logs').delete().match({ task_id: task.id, date: today })
      fetchData(); fetchProfile(user.id); return
    }

    triggerConfetti() 
    let newStreak = task.streak_status === 'broken' ? 1 : task.current_streak + 1
    await supabase.from('tasks').update({ last_completed_at: today, current_streak: newStreak }).eq('id', task.id)
    await supabase.from('task_logs').insert([{ user_id: user.id, task_id: task.id, date: today, duration_minutes: 0, xp_earned: 20 }])
    if (task.linked_skill_id) await updateSkillXP(task.linked_skill_id, 20)
    fetchData(); fetchProfile(user.id)
  }

  async function updateSkillXP(skillId: number, amount: number) {
    const { data: skill } = await supabase.from('skills').select('*').eq('id', skillId).single()
    if (!skill) return
    let newXp = skill.current_xp + amount; let newLevel = skill.level; let newNextXp = skill.next_level_xp
    if (newXp >= newNextXp) { newLevel += 1; newXp = newXp - newNextXp; newNextXp = Math.floor(newNextXp * 1.5) }
    await supabase.from('skills').update({ level: newLevel, current_xp: newXp, next_level_xp: newNextXp }).eq('id', skillId)
  }

  async function deleteTask(id: number) {
    if (!confirm("Delete this mission?")) return
    await supabase.from('task_logs').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    setMenuOpenId(null); fetchData()
  }

  async function factoryReset() {
    if (!confirm("⚠️ WARNING: This will wipe ALL missions, XP, sleep, and body tracking. Are you sure?")) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await Promise.all(['task_logs', 'tasks', 'goals', 'muscle_tracker', 'sleep_logs', 'knowledge'].map(table => supabase.from(table).delete().eq('user_id', user.id)))
    await supabase.from('skills').update({ current_xp: 0, level: 1 }).eq('user_id', user.id)
    window.location.reload()
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const activeTasks = tasks.filter(t => t.type === 'Goal' || t.last_completed_at !== todayStr)
  const processedTasks = tasks.filter(t => t.type !== 'Goal' && t.last_completed_at === todayStr)
  const activeGoals = tasks.filter(t => t.type === 'Goal')

  return (
    <div className="w-full pb-24 md:pb-20 animate-in fade-in duration-700">
      <CreateTaskModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTask(null) }} onTaskAdded={fetchData} initialData={editingTask}/>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {greeting}, Commander
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm md:text-base">System fully operational. Ready to execute.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hidden md:flex">
              <CalendarDays size={16} className="text-indigo-500" /> {format(new Date(), 'MMM do')}
           </div>
           <button onClick={factoryReset} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 p-2.5 rounded-lg shadow-sm transition-all"><PowerOff size={16} /></button>
           <button onClick={() => { setEditingTask(null); setIsModalOpen(true) }} className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 text-sm md:text-base">
             <Plus size={16} /> <span className="hidden md:inline">New Mission</span><span className="md:hidden">Add</span>
             <div className="hidden md:flex items-center gap-0.5 ml-2 opacity-80 text-[10px] bg-indigo-800 px-1.5 py-0.5 rounded border border-indigo-500"><Command size={10} />K</div>
           </button>
        </div>
      </header>

      <NotificationManager /> 

      {/* 🎯 BENTO GRID STATS: Clean, Sharp, Enterprise */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
        <StatCard icon={Target} color="indigo" label="Current Rank" value={userRank} subValue={`${totalXP} XP`} />
        <StatCard icon={Flame} color="orange" label="Max Streak" value={`${Math.max(...tasks.map(t => t.current_streak), 0)}`} subValue="Days" />
        <StatCard icon={Check} color="emerald" label="Today's Focus" value={`${Math.round((processedTasks.length / (tasks.length || 1)) * 100)}%`} subValue="Done" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
        <div className="xl:col-span-8 space-y-8">
          <BodyTracker />
          <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Play size={18} className="text-indigo-500 fill-indigo-500" /> Active Missions
              </h2>
              {activeTasks.length === 0 && !loading && (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
                   <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
                   <p className="text-slate-900 dark:text-white font-bold text-lg mb-1">All clear for today.</p>
                   <p className="text-slate-500 text-sm">Take a break, or press Cmd+K to launch a new objective.</p>
                </div>
              )}
              <div className="space-y-3">
                {activeTasks.map(task => <TaskCard key={task.id} task={task} toggleComplete={toggleComplete} addTimeQuick={addTimeQuick} setEditingTask={setEditingTask} setIsModalOpen={setIsModalOpen} deleteTask={deleteTask} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} isProcessed={false} />)}
              </div>
          </div>
          
          {processedTasks.length > 0 && (
             <div className="pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Check size={14} className="text-emerald-500" /> Mission Archive (Completed Today)
                </h3>
                <div className="space-y-3">
                   {processedTasks.map(task => <TaskCard key={task.id} task={task} toggleComplete={toggleComplete} addTimeQuick={addTimeQuick} setEditingTask={setEditingTask} setIsModalOpen={setIsModalOpen} deleteTask={deleteTask} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} isProcessed={true} />)}
                </div>
             </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-8">
          <RecoveryMatrix />

          {/* Clean Calendar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2"><CalendarDays size={16} className="text-indigo-500"/> Map</h3>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-widest">Today</span>
             </div>
             <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-sm">
                {['M','T','W','T','F','S','S'].map((d, i) => <span key={i} className="text-slate-400 font-bold text-xs py-2">{d}</span>)}
                {Array.from({ length: getDay(startOfMonth(new Date())) === 0 ? 6 : getDay(startOfMonth(new Date())) - 1 }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: getDaysInMonth(new Date()) }).map((_, i) => {
                  const isToday = (i + 1) === new Date().getDate();
                  return (
                    <div key={i} className={cn("h-7 w-7 flex items-center justify-center rounded-md text-xs font-semibold mx-auto", isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer")}>
                      {i + 1}
                    </div>
                  )
                })}
             </div>
          </div>

          {/* Clean Goals */}
          <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 p-6 rounded-xl shadow-sm">
             <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-base mb-4 flex items-center gap-2">
               <Target size={16} /> Weekly Focus
             </h3>
             <div className="space-y-2">
               {activeGoals.length > 0 ? activeGoals.map(g => (
                 <div key={g.id} className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer group/goal hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{g.title}</span>
                    <ArrowUpRight size={16} className="text-indigo-400 group-hover/goal:text-indigo-600 dark:group-hover/goal:text-indigo-400 transition-colors" />
                 </div>
               )) : <div className="text-center py-4 text-indigo-600/50 dark:text-indigo-300/40 text-xs font-bold uppercase tracking-widest border border-dashed border-indigo-200 dark:border-indigo-400/20 rounded-lg">No active strategy.</div>}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, color, label, value, subValue }: any) {
  const colors: any = { 
    indigo: "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", 
    orange: "bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400", 
    emerald: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
  }
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0", colors[color])}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
          {subValue && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{subValue}</span>}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, toggleComplete, addTimeQuick, setEditingTask, setIsModalOpen, deleteTask, menuOpenId, setMenuOpenId, isProcessed }: any) {
  const [customTime, setCustomTime] = useState('')
  const handleCustomTime = (e: React.FormEvent) => { e.preventDefault(); const mins = parseInt(customTime); if (mins && mins > 0) { addTimeQuick(task, mins); setCustomTime('') } }

  return (
    <div className={cn(
      "group relative p-4 md:p-5 rounded-xl border shadow-sm transition-all duration-200",
      isProcessed ? "bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-60" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700",
      task.type === 'Goal' && !isProcessed && "border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-900/10",
      task.streak_status === 'warning' && !isProcessed && "border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10"
    )}>
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><MoreVertical size={16} /></button>
        {menuOpenId === task.id && (
          <div className="absolute right-0 top-8 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
            <button onClick={() => { setEditingTask(task); setIsModalOpen(true); setMenuOpenId(null) }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Edit Mission</button>
            <button onClick={() => deleteTask(task.id)} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div className="mt-0.5 shrink-0">
           {task.time_goal_minutes > 0 ? (
              <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center transition-colors", isProcessed ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400" : "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400")}><Clock size={18} /></div>
           ) : (
              <button onClick={() => toggleComplete(task)} className={cn("w-10 h-10 rounded-lg border flex items-center justify-center transition-colors", task.type === 'Goal' ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400" : (isProcessed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500 hover:border-emerald-200 dark:hover:border-emerald-500/30"))}><Check size={18} strokeWidth={isProcessed ? 3 : 2} /></button>
           )}
        </div>

        <div className="flex-1 pr-6 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {task.category && <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">{task.category}</span>}
            {task.streak_status === 'warning' && !isProcessed && <span className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Flame size={10} /> Critical</span>}
          </div>
          
          <h3 className={cn("text-base font-bold mb-2 truncate", isProcessed ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white")}>{task.title}</h3>
          
          <div className="space-y-3">
            {task.time_goal_minutes > 0 && (
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                  <span className="uppercase tracking-widest">Output</span>
                  <span className={cn(task.current_progress >= task.time_goal_minutes ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400")}>{task.current_progress} / {task.time_goal_minutes}m {task.current_progress >= task.time_goal_minutes && "🏆"}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-1000", task.current_progress >= task.time_goal_minutes ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${Math.min((task.current_progress / task.time_goal_minutes) * 100, 100)}%` }} />
                </div>
                
                {!isProcessed && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                     {[15, 30, 60].map(m => (
                       <button key={m} onClick={() => addTimeQuick(task, m)} className="flex-1 text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-1.5 rounded-lg hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/50 dark:hover:text-indigo-400 transition-colors">+{m}m</button>
                     ))}
                     <form onSubmit={handleCustomTime} className="flex-1 flex gap-1">
                       <input type="number" min="1" placeholder="Min" value={customTime} onChange={e => setCustomTime(e.target.value)} className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                       <button type="submit" disabled={!customTime} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors disabled:opacity-50">+</button>
                     </form>
                  </div>
                )}
              </div>
            )}
            {task.frequency_goal > 0 && task.frequency_goal < 7 && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Consistency</span>
                {Array.from({ length: task.frequency_goal }).map((_, i) => <div key={i} className={cn("w-2 h-2 rounded-full", isProcessed && i < task.current_progress ? "bg-slate-300 dark:bg-slate-600" : (i < task.current_progress ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-800"))} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}