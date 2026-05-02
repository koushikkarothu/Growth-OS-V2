'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Brain, Play, XSquare, CheckCircle2, ShieldAlert, MonitorOff, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FlowStatePage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  
  // Timer States
  const [duration, setDuration] = useState(60) 
  const [timeLeft, setTimeLeft] = useState(60 * 60) 
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState<'setup' | 'flowing' | 'success' | 'failed'>('setup')
  
  // ⚡ NEW: Resolution State
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0); 
  
  const [isStrictMode, setIsStrictMode] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchActiveTasks()
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isStrictMode && document.hidden && status === 'flowing') {
        failFlow("Distraction Detected. You broke the Strict Mode lock.")
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [status, isStrictMode])

  async function fetchActiveTasks() {
    const todayStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (data) {
      const active = data.filter(t => t.last_completed_at !== todayStr && t.type !== 'Goal' && t.status !== 'completed')
      setTasks(active)
    }
  }

  function startFlow() {
    if (!selectedTask) { alert("Select a mission first, Commander."); return }
    setTimeLeft(duration * 60)
    setSessionDuration(duration) // Store intended duration
    setStatus('flowing')
    setIsActive(true)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          completeFlow()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function failFlow(reason: string) {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsActive(false)
    setStatus('failed')
  }

  function stopEarly() {
    if(!confirm("Are you sure? Stopping now will break your flow state and mark this as failed.")) return
    failFlow("You aborted the mission early.")
  }

  // ⚡ NEW: Base completion triggers modal
  async function completeFlow() {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsActive(false)
    setStatus('success')
    
    // Award Base XP for finishing block
    awardXP(duration * 2); 
    setShowCompletionModal(true);
  }

  // ⚡ NEW: XP API Call
  const awardXP = async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Fetch current XP, add amount, update. (Requires a profile or user_data table)
      const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
      if (profile) {
          await supabase.from('profiles').update({ xp: (profile.xp || 0) + amount }).eq('id', user.id);
      }
  };

  // ⚡ NEW: Final Resolution Logic
  const handleMissionResolution = async (isFullyComplete: boolean) => {
      if (!selectedTask) return;
      const today = new Date().toISOString().split('T')[0];

      if (isFullyComplete) {
          // Mark as completely done
          await supabase.from('tasks').update({ 
              status: 'completed', 
              time_logged: (selectedTask.time_logged || 0) + sessionDuration,
              last_completed_at: today
          }).eq('id', selectedTask.id);
          
          awardXP(100); // Bonus XP
      } else {
          // Just log the time
          await supabase.from('tasks').update({ 
              time_logged: (selectedTask.time_logged || 0) + sessionDuration,
              last_completed_at: today, // Update last active date
              current_streak: selectedTask.current_streak + 1
          }).eq('id', selectedTask.id);
      }
      
      // Log the session
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('task_logs').insert([{ 
        user_id: user?.id, task_id: selectedTask.id, date: today, 
        duration_minutes: sessionDuration, xp_earned: isFullyComplete ? (duration * 2) + 100 : (duration * 2)
      }])

      setShowCompletionModal(false);
  };

  function resetEngine() {
    setStatus('setup')
    setSelectedTask(null)
    fetchActiveTasks() // Refresh list to hide completed tasks
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const progressPercent = ((duration * 60 - timeLeft) / (duration * 60)) * 100

  if (status === 'setup') {
    return (
      <div className="max-w-2xl mx-auto pt-10 pb-20 animate-in fade-in duration-500 px-4">
        <header className="mb-10 text-center">
          <div className="w-16 h-16 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-slate-900 mx-auto mb-6 shadow-xl">
            <Brain size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Deep Work Engine</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Lock in. Block the noise. Execute.</p>
        </header>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-sm">
          
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">1. Select Target Mission</h3>
          <div className="grid grid-cols-1 gap-3 mb-8">
            {tasks.length === 0 ? <p className="text-sm text-slate-500 font-bold bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">No active missions available. Check your Dashboard.</p> : null}
            {tasks.map(t => (
              <button 
                key={t.id} onClick={() => setSelectedTask(t)}
                className={cn("p-4 text-left rounded-xl border transition-all font-bold", selectedTask?.id === t.id ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300" : "bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700")}
              >
                {t.title}
              </button>
            ))}
          </div>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">2. Set Focus Duration</h3>
          <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
            {[25, 45, 60, 90].map(time => (
              <button 
                key={time} onClick={() => setDuration(time)}
                className={cn("flex-1 min-w-[70px] py-3 rounded-xl border transition-all font-bold text-lg", duration === time ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" : "bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
              >
                {time}m
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-10 border border-slate-200 dark:border-slate-700">
             <div className="flex items-start gap-3">
               <div className={cn("mt-0.5", isStrictMode ? "text-red-500" : "text-slate-400")}><MonitorOff size={18} /></div>
               <div>
                 <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">Strict Mode</h4>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-[250px]">
                   If enabled, switching tabs or minimizing the window will instantly fail the mission.
                 </p>
               </div>
             </div>
             <button 
               onClick={() => setIsStrictMode(!isStrictMode)}
               className={cn("w-12 h-6 rounded-full transition-colors relative flex-shrink-0", isStrictMode ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600")}
             >
               <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-transform", isStrictMode ? "translate-x-7" : "translate-x-1")} />
             </button>
          </div>

          <button 
            onClick={startFlow}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[0.98] shadow-xl"
          >
            <Play fill="currentColor" size={18} /> Enter Flow State
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 transition-colors duration-1000",
      status === 'flowing' ? "bg-slate-950 text-white" : status === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    )}>
      
      {status === 'flowing' && (
        <div className="text-center animate-in fade-in zoom-in duration-700">
           <span className="text-indigo-400 font-bold tracking-widest uppercase text-sm mb-4 block">Executing: {selectedTask?.title}</span>
           
           <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto mb-12">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" className="stroke-slate-800" strokeWidth="2" fill="transparent" />
                <circle cx="50" cy="50" r="48" className={cn("transition-all duration-1000 ease-linear", isStrictMode ? "stroke-red-500" : "stroke-indigo-500")} strokeWidth="2" fill="transparent" strokeDasharray="301.59" strokeDashoffset={301.59 - (progressPercent / 100) * 301.59} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl md:text-8xl font-black tabular-nums tracking-tighter">
                  {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                </span>
                {isStrictMode && <span className="text-red-500 font-bold tracking-widest text-[10px] uppercase mt-2 animate-pulse flex items-center gap-1"><MonitorOff size={10} /> Strict Lock Active</span>}
              </div>
           </div>

           <button onClick={stopEarly} className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 mx-auto uppercase text-xs font-bold tracking-widest">
             <XSquare size={16} /> Abort Mission
           </button>
        </div>
      )}

      {/* ⚡ THE RESOLUTION MODAL */}
      {showCompletionModal && (
          <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-[2rem] max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Target className="text-emerald-400" size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Focus Session Complete!</h2>
                  <p className="text-emerald-400 font-black tracking-widest uppercase mb-8">+{duration * 2} Base XP Awarded</p>
                  
                  <p className="text-slate-300 font-medium mb-8 text-sm">
                      Time logged. Is the mission <span className="text-white font-bold">"{selectedTask?.title}"</span> fully complete for today?
                  </p>

                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={() => handleMissionResolution(true)} 
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg"
                      >
                          Yes, Mission Accomplished (+100 XP)
                      </button>
                      <button 
                          onClick={() => handleMissionResolution(false)} 
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-xl transition-all"
                      >
                          No, Just Logging Time
                      </button>
                  </div>
              </div>
          </div>
      )}

      {status === 'success' && !showCompletionModal && (
        <div className="text-center animate-in slide-in-from-bottom-10">
          <CheckCircle2 size={80} className="mx-auto mb-6 text-emerald-200" />
          <h2 className="text-5xl font-black mb-4 tracking-tight">Mission Logged</h2>
          <p className="text-emerald-100 text-xl font-medium mb-12">Neural pathways strengthened.</p>
          <button onClick={resetEngine} className="bg-white text-emerald-700 px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl">
            Return to Base
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center animate-in shake">
          <ShieldAlert size={80} className="mx-auto mb-6 text-red-200" />
          <h2 className="text-5xl font-black mb-4 tracking-tight">Flow Broken</h2>
          <p className="text-red-100 text-xl font-medium mb-12">You compromised the mission.</p>
          <button onClick={resetEngine} className="bg-white text-red-700 px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl">
            Acknowledge Failure
          </button>
        </div>
      )}

    </div>
  )
}