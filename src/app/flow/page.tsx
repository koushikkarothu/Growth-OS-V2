'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Brain, Play, XSquare, CheckCircle2, ShieldAlert, MonitorOff, Target, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FlowStatePage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  
  const [duration, setDuration] = useState(60) 
  const [timeLeft, setTimeLeft] = useState(60 * 60) 
  const [endTime, setEndTime] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState<'setup' | 'flowing' | 'success' | 'failed'>('setup')
  
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0); 
  const [isStrictMode, setIsStrictMode] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const wakeLockRef = useRef<any>(null) 

  useEffect(() => {
    const initializeFlowState = async () => {
        const fetchedTasks = await fetchActiveTasks()
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const queryTaskId = params.get('taskId')
            const queryDuration = params.get('duration')

            if (queryDuration && !isNaN(parseInt(queryDuration))) setDuration(parseInt(queryDuration))
            if (queryTaskId && fetchedTasks) {
                const targetTask = fetchedTasks.find(t => String(t.id) === queryTaskId)
                if (targetTask) setSelectedTask(targetTask)
            }
        }
    }
    initializeFlowState()
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
      return active 
    }
    return []
  }

  const requestWakeLock = async () => {
      try {
          if ('wakeLock' in navigator) {
              wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
          }
      } catch (err) { console.warn("Wake Lock not supported or denied.") }
  }

  const releaseWakeLock = () => {
      if (wakeLockRef.current) {
          wakeLockRef.current.release().then(() => { wakeLockRef.current = null })
      }
  }

  function startFlow() {
    if (!selectedTask) { alert("Select a mission first."); return }
    
    const targetEndTime = Date.now() + (duration * 60 * 1000)
    setEndTime(targetEndTime)
    setTimeLeft(duration * 60)
    setSessionDuration(duration) 
    setStatus('flowing')
    setIsActive(true)

    requestWakeLock() 

    timerRef.current = setInterval(() => {
      const now = Date.now()
      const remainingSeconds = Math.max(0, Math.ceil((targetEndTime - now) / 1000))
      setTimeLeft(remainingSeconds)

      if (remainingSeconds <= 0) {
        completeFlow()
      }
    }, 1000)
  }

  function failFlow(reason: string) {
    if (timerRef.current) clearInterval(timerRef.current)
    releaseWakeLock()
    setIsActive(false)
    setStatus('failed')
  }

  function stopEarly() {
    if(!confirm("Are you sure? Stopping now will break your flow state and mark this as failed.")) return
    failFlow("You aborted the mission early.")
  }

  async function completeFlow() {
    if (timerRef.current) clearInterval(timerRef.current)
    releaseWakeLock()
    setIsActive(false)
    setStatus('success')
    awardXP(duration * 2); 
    setShowCompletionModal(true);
  }

  const awardXP = async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
      if (profile) await supabase.from('profiles').update({ xp: (profile.xp || 0) + amount }).eq('id', user.id);
  };

  const handleMissionResolution = async (isFullyComplete: boolean) => {
      if (!selectedTask) return;
      const today = new Date().toISOString().split('T')[0];

      if (isFullyComplete) {
          await supabase.from('tasks').update({ 
              status: 'completed', time_logged: (selectedTask.time_logged || 0) + sessionDuration, last_completed_at: today
          }).eq('id', selectedTask.id);
          awardXP(100); 
      } else {
          await supabase.from('tasks').update({ 
              time_logged: (selectedTask.time_logged || 0) + sessionDuration, last_completed_at: today, current_streak: selectedTask.current_streak + 1
          }).eq('id', selectedTask.id);
      }
      
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
    fetchActiveTasks() 
    if (typeof window !== 'undefined') window.history.replaceState({}, '', '/flow');
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const progressPercent = ((duration * 60 - timeLeft) / (duration * 60)) * 100
  const durationOptions = Array.from(new Set([25, 45, 60, 90, duration])).sort((a, b) => a - b);

  if (status === 'setup') {
    return (
      <div className="w-full max-w-3xl mx-auto pt-8 pb-20 animate-in fade-in duration-500 px-4 md:px-0">
        <header className="mb-10 text-center">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-indigo-500/20">
            <Brain size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Deep Work Engine</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Lock in. Block the noise. Execute.</p>
        </header>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-10 rounded-3xl shadow-sm">
          
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Target size={14}/> 1. Target Mission</h3>
          <div className="grid grid-cols-1 gap-2 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {tasks.length === 0 ? <p className="text-sm text-slate-500 font-medium bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">No active missions available.</p> : null}
            {tasks.map(t => (
              <button 
                key={t.id} onClick={() => setSelectedTask(t)}
                className={cn("p-4 text-left rounded-xl border transition-all font-bold group flex justify-between items-center text-sm", 
                    selectedTask?.id === t.id ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-400 shadow-sm" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-slate-600"
                )}
              >
                {t.title}
                {selectedTask?.id === t.id && <CheckCircle2 size={16} className="text-indigo-500 animate-in zoom-in"/>}
              </button>
            ))}
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={14}/> 2. Focus Duration</h3>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
            {durationOptions.map(time => (
              <button 
                key={time} onClick={() => setDuration(time)}
                className={cn("flex-1 min-w-[70px] py-3 rounded-xl border transition-all font-black text-base", 
                    duration === time ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                {time}m
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl mb-8 border border-slate-200 dark:border-slate-800 shadow-inner">
             <div className="flex items-start gap-4">
               <div className={cn("mt-0.5 p-2 rounded-lg", isStrictMode ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700")}><MonitorOff size={18} /></div>
               <div>
                 <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-0.5 uppercase tracking-widest">Strict Mode</h4>
                 <p className="text-xs text-slate-500 font-medium max-w-[250px] leading-relaxed">
                   Switching tabs or turning off the screen will instantly fail the mission.
                 </p>
               </div>
             </div>
             <button 
               onClick={() => setIsStrictMode(!isStrictMode)}
               className={cn("w-12 h-6 rounded-full transition-colors relative flex-shrink-0 border", isStrictMode ? "bg-red-500 border-red-600" : "bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600")}
             >
               <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform", isStrictMode ? "translate-x-7" : "translate-x-1")} />
             </button>
          </div>

          <button 
            onClick={startFlow} disabled={!selectedTask}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-slate-800 dark:hover:bg-slate-200 shadow-md disabled:opacity-50 text-sm"
          >
            <Play fill="currentColor" size={16} /> Initiate Sequence
          </button>
        </div>
        <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }`}} />
      </div>
    )
  }

  // ACTIVE FLOW STATE - Immersive Dark Screen
  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 transition-colors duration-1000",
      status === 'flowing' ? "bg-slate-950 text-white" : status === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    )}>
      
      {status === 'flowing' && (
        <div className="text-center animate-in fade-in zoom-in duration-700 w-full max-w-lg">
           <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-6 block bg-indigo-900/20 py-2 rounded-lg border border-indigo-500/20 shadow-sm">Target: {selectedTask?.title}</span>
           
           <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto mb-16 mt-8">
              <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.2)]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" className="stroke-slate-800" strokeWidth="1.5" fill="transparent" />
                <circle cx="50" cy="50" r="48" className={cn("transition-all duration-1000 ease-linear", isStrictMode ? "stroke-red-500" : "stroke-indigo-500")} strokeWidth="2" fill="transparent" strokeDasharray="301.59" strokeDashoffset={301.59 - (progressPercent / 100) * 301.59} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl md:text-8xl font-black tabular-nums tracking-tighter drop-shadow-2xl">
                  {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                </span>
                {isStrictMode && <span className="text-red-500 font-bold tracking-widest text-[10px] uppercase mt-4 animate-pulse flex items-center gap-1.5 bg-red-900/20 px-3 py-1 rounded-md border border-red-500/30"><MonitorOff size={12} /> Strict Lock Active</span>}
              </div>
           </div>

           <button onClick={stopEarly} className="text-slate-400 hover:text-red-400 hover:bg-red-900/20 px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 mx-auto uppercase text-xs font-bold tracking-widest border border-transparent hover:border-red-500/30">
             <XSquare size={16} /> Abort Mission
           </button>
        </div>
      )}

      {showCompletionModal && (
          <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                      <Target className="text-emerald-400" size={36} />
                  </div>
                  <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Session Complete</h2>
                  <p className="text-emerald-400 font-bold tracking-widest uppercase mb-8 text-xs">+{duration * 2} Base XP Secured</p>
                  
                  <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl mb-8">
                      <p className="text-slate-300 font-medium text-sm leading-relaxed">
                          Time successfully logged. Is the mission <br/><span className="text-white font-bold inline-block mt-2">"{selectedTask?.title}"</span><br/> fully complete for the day?
                      </p>
                  </div>

                  <div className="flex flex-col gap-3">
                      <button onClick={() => handleMissionResolution(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md text-xs">
                          Yes, Mission Accomplished (+100 XP)
                      </button>
                      <button onClick={() => handleMissionResolution(false)} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold py-3.5 rounded-xl transition-all text-xs">
                          No, Just Logging Time
                      </button>
                  </div>
              </div>
          </div>
      )}

      {status === 'success' && !showCompletionModal && (
        <div className="text-center animate-in slide-in-from-bottom-10">
          <CheckCircle2 size={80} className="mx-auto mb-6 text-emerald-200 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight drop-shadow-lg">Mission Logged</h2>
          <p className="text-emerald-100 font-medium mb-10 opacity-90 text-lg">Neural pathways strengthened.</p>
          <button onClick={resetEngine} className="bg-white text-emerald-700 px-10 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl">
            Return to Base
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center animate-in shake">
          <ShieldAlert size={80} className="mx-auto mb-6 text-red-200 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight drop-shadow-lg">Flow Broken</h2>
          <p className="text-red-100 font-medium mb-10 opacity-90 text-lg">You compromised the mission.</p>
          <button onClick={resetEngine} className="bg-white text-red-700 px-10 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl">
            Acknowledge Failure
          </button>
        </div>
      )}
    </div>
  )
}