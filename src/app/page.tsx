'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { 
  Check, Play, Clock, Flame, MoreVertical, 
  ArrowUpRight, Target, CalendarDays, Plus, 
  Command, CheckCircle2, PowerOff, Zap
} from 'lucide-react'
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
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setEditingTask(null)
        setIsModalOpen(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const hours = new Date().getHours()
    if (hours < 12) setGreeting('Good Morning')
    else if (hours < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchData()
      fetchProfile(user.id)
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
        
        if (!t.last_completed_at) {
            calculatedStreak = 0; status = 'broken'
        } else {
            const lastDate = parseISO(t.last_completed_at)
            const diff = differenceInCalendarDays(today, lastDate)

            if (t.frequency_goal === 7) {
                if (diff === 0 || diff === 1) status = 'active'
                else if (diff === 2) status = 'warning'
                else { status = 'broken'; calculatedStreak = 0 }
            } else {
                if (diff > 8) { status = 'broken'; calculatedStreak = 0 }
            }
        }

        let progress = 0
        if (t.time_goal_minutes > 0) {
           progress = logsData?.filter(l => l.task_id === t.id).reduce((sum, curr) => sum + (curr.duration_minutes || 0), 0) || 0
        } else {
           const taskLogs = logsData?.filter(l => l.task_id === t.id) || []
           const uniqueDays = new Set(taskLogs.map(l => l.date)).size
           progress = uniqueDays
        }
        combined.push({ ...t, type: 'Task', current_progress: progress, streak_status: status, current_streak: calculatedStreak })
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

  const triggerConfetti = () => { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#a855f7', '#ec4899'] }) }

  async function addTimeQuick(task: Task, minutes: number) {
     const today = new Date().toISOString().split('T')[0]
     const { data: { user } } = await supabase.auth.getUser()
     if(!user) return
     let xp = minutes 
     if (task.current_progress >= task.time_goal_minutes) xp = Math.floor(minutes * 1.5)
     
     await supabase.from('task_logs').insert([{ user_id: user.id, task_id: task.id, date: today, duration_minutes: minutes, xp_earned: xp }])
     
     let newStreak = task.current_streak
     if (task.current_progress + minutes >= task.time_goal_minutes && task.current_progress < task.time_goal_minutes) {
         newStreak += 1; triggerConfetti() 
     }

     await supabase.from('tasks').update({ last_completed_at: today, current_streak: newStreak }).eq('id', task.id)
     if (task.linked_skill_id) await updateSkillXP(task.linked_skill_id, xp)
     fetchData(); fetchProfile(user.id)
  }

  async function toggleComplete(task: Task) {
    if (task.type === 'Goal') { 
        await supabase.from('goals').update({ status: 'Done' }).eq('id', Math.abs(task.id))
        triggerConfetti()
        fetchData(); return 
    }
    
    const today = new Date().toISOString().split('T')[0]
    const isDoneToday = task.last_completed_at === today
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return

    if (isDoneToday) {
      await supabase.from('tasks').update({ last_completed_at: null }).eq('id', task.id)
      await supabase.from('task_logs').delete().match({ task_id: task.id, date: today })
      fetchData(); fetchProfile(user.id)
      return
    }

    triggerConfetti() 
    let newStreak = task.current_streak + 1
    if (task.streak_status === 'broken') newStreak = 1
    
    await supabase.from('tasks').update({ last_completed_at: today, current_streak: newStreak }).eq('id', task.id)
    await supabase.from('task_logs').insert([{ user_id: user.id, task_id: task.id, date: today, duration_minutes: 0, xp_earned: 20 }])
    
    if (task.linked_skill_id) await updateSkillXP(task.linked_skill_id, 20)
    fetchData(); fetchProfile(user.id)
  }

  async function updateSkillXP(skillId: number, amount: number) {
    const { data: skill } = await supabase.from('skills').select('*').eq('id', skillId).single()
    if (!skill) return
    let newXp = skill.current_xp + amount
    let newLevel = skill.level
    let newNextXp = skill.next_level_xp
    if (newXp >= newNextXp) {
      newLevel += 1; newXp = newXp - newNextXp; newNextXp = Math.floor(newNextXp * 1.5)
      setTimeout(() => alert(`⚡ ELITE UPGRADE: ${skill.name} advanced to Level ${newLevel}!`), 500)
    }
    await supabase.from('skills').update({ level: newLevel, current_xp: newXp, next_level_xp: newNextXp }).eq('id', skillId)
  }

  async function deleteTask(id: number) {
    if (!confirm("Delete this mission?")) return
    await supabase.from('task_logs').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    setMenuOpenId(null); fetchData()
  }

  async function factoryReset() {
    const confirm1 = confirm("⚠️ WARNING: This will permanently wipe ALL your missions, XP, sleep data, and body tracking. Are you sure?")
    if (!confirm1) return
    const confirm2 = confirm("Commander, this is the point of no return. Execute System Wipe?")
    if (!confirm2) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('task_logs').delete().eq('user_id', user.id)
    await supabase.from('tasks').delete().eq('user_id', user.id)
    await supabase.from('goals').delete().eq('user_id', user.id)
    await supabase.from('muscle_tracker').delete().eq('user_id', user.id)
    await supabase.from('sleep_logs').delete().eq('user_id', user.id)
    await supabase.from('knowledge').delete().eq('user_id', user.id)
    await supabase.from('skills').update({ current_xp: 0, level: 1 }).eq('user_id', user.id)
    alert("System reset complete. Rebooting...")
    window.location.reload()
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const activeTasks = tasks.filter(t => { if (t.type === 'Goal') return true; return t.last_completed_at !== todayStr })
  const processedTasks = tasks.filter(t => { if (t.type === 'Goal') return false; return t.last_completed_at === todayStr })
  const activeGoals = tasks.filter(t => t.type === 'Goal')

  return (
    <div className="w-full pb-24 md:pb-20 animate-in fade-in duration-700">
      <CreateTaskModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTask(null) }} onTaskAdded={fetchData} initialData={editingTask}/>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight flex items-center gap-3">
            {greeting}, Commander
          </h1>
          <p className="text-slate-400 mt-2 font-medium text-sm md:text-base flex items-center gap-2">
            System fully operational. Ready to execute.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-slate-900/40 backdrop-blur-xl px-5 py-2.5 rounded-xl border border-white/5 shadow-sm flex items-center gap-2 text-sm font-semibold text-slate-300 hidden md:flex">
              <CalendarDays size={16} className="text-indigo-400" />
              {format(new Date(), 'MMM do')}
           </div>
           
           <button 
             onClick={factoryReset}
             className="bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-red-500/30 hover:bg-red-500/10 text-slate-400 hover:text-red-400 p-2.5 rounded-xl transition-all"
             title="Factory Reset OS"
           >
             <PowerOff size={18} />
           </button>

           <button 
             onClick={() => { setEditingTask(null); setIsModalOpen(true) }} 
             className="group bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all duration-300 flex items-center gap-2 active:scale-95 text-sm md:text-base"
           >
             <Plus size={18} className="transition-transform group-hover:rotate-90" /> 
             <span className="hidden md:inline">New Mission</span><span className="md:hidden">Add</span>
             <div className="hidden md:flex items-center gap-0.5 ml-2 opacity-60 text-[10px] bg-white/20 px-1.5 py-0.5 rounded border border-white/10">
                <Command size={10} />K
             </div>
           </button>
        </div>
      </header>

      <NotificationManager /> 

      {/* 🎯 BENTO GRID STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-10">
        <StatCard icon={Target} color="indigo" label="Current Rank" value={userRank} subValue={`${totalXP} XP`} />
        <StatCard icon={Flame} color="orange" label="Max Streak" value={`${Math.max(...tasks.map(t => t.current_streak), 0)}`} subValue="Days" />
        <StatCard icon={Check} color="emerald" label="Today's Focus" value={`${Math.round((processedTasks.length / (tasks.length || 1)) * 100)}%`} subValue="Done" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-12">
        
        {/* LEFT COLUMN: Body Tracker + Active Missions */}
        <div className="xl:col-span-8 space-y-10">
          
          <BodyTracker />

          <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6 uppercase tracking-widest">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30"><Play size={18} className="text-indigo-400 fill-indigo-400" /></div> 
                Active Missions
              </h2>
              
              {activeTasks.length === 0 && !loading && (
                <div className="bg-slate-900/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-12 text-center animate-in zoom-in-95 duration-500">
                   <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                     <CheckCircle2 size={32} className="text-emerald-400" />
                   </div>
                   <p className="text-white font-black text-xl mb-2 tracking-tight">All clear for today.</p>
                   <p className="text-slate-400 text-sm font-medium">Take a break, or press Cmd+K to launch a new objective.</p>
                </div>
              )}

              <div className="space-y-4">
                {activeTasks.map(task => (
                  <TaskCard key={task.id} task={task} toggleComplete={toggleComplete} addTimeQuick={addTimeQuick} setEditingTask={setEditingTask} setIsModalOpen={setIsModalOpen} deleteTask={deleteTask} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} isProcessed={false} />
                ))}
              </div>
          </div>
          
          {processedTasks.length > 0 && (
             <div className="pt-4 animate-in fade-in duration-700">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-white/5 pb-2">
                  <Check size={14} className="text-emerald-500" /> Mission Archive (Completed Today)
                </h3>
                <div className="space-y-3">
                   {processedTasks.map(task => (
                      <TaskCard key={task.id} task={task} toggleComplete={toggleComplete} addTimeQuick={addTimeQuick} setEditingTask={setEditingTask} setIsModalOpen={setIsModalOpen} deleteTask={deleteTask} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} isProcessed={true} />
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* RIGHT COLUMN: Recovery Matrix + Calendar + Goals */}
        <div className="xl:col-span-4 space-y-8">
          
          <RecoveryMatrix />

          {/* PREMIUM CALENDAR BENTO */}
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-white text-lg flex items-center gap-2"><CalendarDays size={18} className="text-indigo-400"/> Map</h3>
                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-widest">Today</span>
             </div>
             <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-sm">
                {['M','T','W','T','F','S','S'].map((d, i) => <span key={i} className="text-slate-500 font-bold text-[10px] uppercase tracking-widest py-2">{d}</span>)}
                
                {Array.from({ length: getDay(startOfMonth(new Date())) === 0 ? 6 : getDay(startOfMonth(new Date())) - 1 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {Array.from({ length: getDaysInMonth(new Date()) }).map((_, i) => {
                  const isToday = (i + 1) === new Date().getDate();
                  return (
                    <div key={i} className={cn("h-8 w-8 flex items-center justify-center rounded-[10px] text-xs font-bold transition-all mx-auto", isToday ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-110" : "text-slate-400 hover:bg-slate-800 cursor-pointer hover:text-white")}>
                      {i + 1}
                    </div>
                  )
                })}
             </div>
          </div>

          {/* PREMIUM GOALS BENTO */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
             <h3 className="font-black text-white text-lg mb-1 relative z-10 flex items-center gap-2">
               <Target size={18} className="text-indigo-400" /> Weekly Focus
             </h3>
             <div className="space-y-3 relative z-10 mt-6">
               {activeGoals.length > 0 ? activeGoals.map(g => (
                 <div key={g.id} className="bg-slate-950/40 hover:bg-slate-950/60 backdrop-blur-md p-4 rounded-xl border border-white/5 flex items-center justify-between transition-colors cursor-pointer group/goal">
                    <span className="text-sm font-bold text-slate-200">{g.title}</span>
                    <ArrowUpRight size={16} className="text-indigo-400 group-hover/goal:translate-x-0.5 group-hover/goal:-translate-y-0.5 transition-transform" />
                 </div>
               )) : <div className="text-center py-6 text-indigo-300/40 text-xs font-bold uppercase tracking-widest border border-dashed border-indigo-400/20 rounded-xl">No active strategy.</div>}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, color, label, value, subValue }: any) {
  const colors: any = { 
    indigo: "bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]", 
    orange: "bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]", 
    emerald: "bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
  }
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-5 group hover:border-white/10 transition-all">
      <div className={cn("w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-transform group-hover:scale-110 duration-300 border border-white/5 shrink-0", colors[color])}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-white tracking-tight">{value}</p>
          {subValue && <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{subValue}</span>}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, toggleComplete, addTimeQuick, setEditingTask, setIsModalOpen, deleteTask, menuOpenId, setMenuOpenId, isProcessed }: any) {
  const [customTime, setCustomTime] = useState('')

  const handleCustomTime = (e: React.FormEvent) => {
    e.preventDefault()
    const mins = parseInt(customTime)
    if (mins && mins > 0) { addTimeQuick(task, mins); setCustomTime('') }
  }

  return (
    <div className={cn(
      "group relative p-6 rounded-[1.5rem] transition-all duration-500",
      task.type === 'Goal' ? "border border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-slate-900/40 backdrop-blur-xl" : 
      isProcessed ? "bg-slate-900/20 backdrop-blur-md border border-white/5 opacity-70 grayscale-[20%]" : 
      "bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5",
      task.streak_status === 'warning' && !isProcessed && "border-orange-500/30 bg-orange-900/10"
    )}>
      
      {/* MENU */}
      <div className="absolute top-4 right-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)} className="text-slate-500 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors">
          <MoreVertical size={18} />
        </button>
        {menuOpenId === task.id && (
          <div className="absolute right-0 top-8 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in zoom-in-95 duration-200">
            <button onClick={() => { setEditingTask(task); setIsModalOpen(true); setMenuOpenId(null) }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors">Edit Mission</button>
            <button onClick={() => deleteTask(task.id)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-900/20 transition-colors">Abort (Delete)</button>
          </div>
        )}
      </div>

      <div className="flex gap-4 md:gap-6">
        
        {/* CHECK / TIME ICON */}
        <div className="mt-1 shrink-0">
           {task.time_goal_minutes > 0 ? (
              <div className={cn("w-12 h-12 rounded-[1rem] border flex items-center justify-center transition-all duration-300", isProcessed ? "bg-slate-800/50 border-slate-700 text-slate-500" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]")}><Clock size={20} /></div>
           ) : (
              <button onClick={() => toggleComplete(task)} className={cn("w-12 h-12 rounded-[1rem] border flex items-center justify-center transition-all duration-300 active:scale-90", task.type === 'Goal' ? "bg-purple-900/20 border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white" : (isProcessed ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-800/50 border-white/5 text-slate-500 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400"))}>
                 <Check size={20} strokeWidth={isProcessed ? 3 : 2} />
              </button>
           )}
        </div>

        <div className="flex-1 pr-6 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {task.category && <span className={cn("border px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest", isProcessed ? "bg-slate-800/50 text-slate-500 border-transparent" : "bg-slate-800 text-slate-400 border-white/5")}>{task.category}</span>}
            {task.streak_status === 'warning' && !isProcessed && <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse"><Flame size={10} /> Recovery Critical</span>}
          </div>
          
          {/* 🎯 THE FIX: No Strikethrough. Elegant Muted State. */}
          <h3 className={cn("text-lg md:text-xl font-black mb-3 transition-colors truncate", isProcessed ? "text-slate-500" : "text-white group-hover:text-indigo-400")}>{task.title}</h3>
          
          <div className="space-y-4">
            {task.time_goal_minutes > 0 && (
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-500 mb-2">
                  <span className="uppercase tracking-widest">Weekly Output</span>
                  <span className={cn("tracking-tight", isProcessed ? "text-slate-500" : (task.current_progress >= task.time_goal_minutes ? "text-emerald-400" : "text-indigo-400"))}>
                     {task.current_progress} / {task.time_goal_minutes}m {task.current_progress >= task.time_goal_minutes && "🏆"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div className={cn("h-full rounded-full transition-all duration-1000 ease-out", isProcessed ? "bg-slate-600" : (task.current_progress >= task.time_goal_minutes ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"))} style={{ width: `${Math.min((task.current_progress / task.time_goal_minutes) * 100, 100)}%` }} />
                </div>
                
                {/* Hide action buttons if the task is processed for the day */}
                {!isProcessed && (
                  <div className="relative md:absolute md:right-5 md:top-1/2 md:-translate-y-1/2 flex flex-wrap items-center gap-2 mt-4 md:mt-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                     {[15, 30, 60].map(m => (
                       <button key={m} onClick={() => addTimeQuick(task, m)} className="flex-1 min-w-[3rem] text-[11px] font-black bg-slate-800 border border-white/5 text-slate-300 py-2 rounded-xl hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all active:scale-95 shadow-sm">+{m}m</button>
                     ))}
                     <form onSubmit={handleCustomTime} className="flex-1 flex min-w-[5.5rem] gap-1">
                       <input 
                         type="number" min="1" placeholder="Mins" 
                         value={customTime} onChange={e => setCustomTime(e.target.value)}
                         className="w-full min-w-0 bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                       />
                       <button 
                         type="submit" disabled={!customTime} 
                         className="bg-slate-800 text-slate-300 px-3 rounded-xl text-xs font-black hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 border border-white/5"
                       >
                         +
                       </button>
                     </form>
                  </div>
                )}
              </div>
            )}

            {task.frequency_goal > 0 && task.frequency_goal < 7 && (
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-[9px] font-black uppercase tracking-widest mr-2", isProcessed ? "text-slate-600" : "text-slate-500")}>Consistency</span>
                {Array.from({ length: task.frequency_goal }).map((_, i) => (
                   <div key={i} className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500", isProcessed && i < task.current_progress ? "bg-slate-600" : (i < task.current_progress ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-110" : "bg-slate-800"))} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}