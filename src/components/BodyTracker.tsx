'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { RotateCw, Zap, Loader2 } from 'lucide-react'
import { differenceInHours, parseISO } from 'date-fns'
import MuscleMap, { MuscleStatus } from './MuscleMap'

export default function BodyTracker() {
  const [muscleLogs, setMuscleLogs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [hoveredName, setHoveredName] = useState<string | null>(null)

  useEffect(() => { fetchMuscles() }, [])

  async function fetchMuscles() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('muscle_tracker').select('muscle_group, updated_at').eq('user_id', user.id)
    
    if (data) {
      const logs: Record<string, string> = {}
      data.forEach(item => { logs[item.muscle_group] = item.updated_at })
      setMuscleLogs(logs)
    }
    setLoading(false)
  }

  // ⏱️ The Heatmap Calculator
  const getStatus = (updatedAt?: string): MuscleStatus => {
    if (!updatedAt) return 'red'
    const diffHours = differenceInHours(new Date(), parseISO(updatedAt))
    if (diffHours < 24) return 'green'  // Max Fatigue
    if (diffHours < 48) return 'yellow' // Recovering
    return 'red'                        // Ready
  }

  async function toggleMuscle(muscleGroup: string) {
    const status = getStatus(muscleLogs[muscleGroup])
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (status === 'green') {
      const newLogs = { ...muscleLogs }
      delete newLogs[muscleGroup]
      setMuscleLogs(newLogs)
      await supabase.from('muscle_tracker').delete().match({ user_id: user.id, muscle_group: muscleGroup })
    } else {
      const now = new Date().toISOString()
      setMuscleLogs({ ...muscleLogs, [muscleGroup]: now })
      await supabase.from('muscle_tracker').upsert(
        { user_id: user.id, muscle_group: muscleGroup, updated_at: now },
        { onConflict: 'user_id, muscle_group' }
      )
    }
  }

  async function resetWeek() {
    if(!confirm("Wipe all tracking data and start fresh?")) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('muscle_tracker').delete().eq('user_id', user?.id)
    setMuscleLogs({})
  }

  const muscleStatuses: Record<string, MuscleStatus> = {}
  Object.keys(muscleLogs).forEach(key => { muscleStatuses[key] = getStatus(muscleLogs[key]) })

  const fatigued = Object.keys(muscleStatuses).filter(k => muscleStatuses[k] === 'green')
  const recovering = Object.keys(muscleStatuses).filter(k => muscleStatuses[k] === 'yellow')
  const ready = ['traps', 'chest', 'abs', 'obliques', 'forearms', 'biceps', 'quads', 'back', 'shoulders', 'glutes', 'hamstrings', 'triceps', 'calves_back'].filter(k => !fatigued.includes(k) && !recovering.includes(k))

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm relative overflow-hidden transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
           <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <Zap size={20} className="text-indigo-500 fill-indigo-500" /> Body Status
           </h3>
           <p className="text-xs text-slate-500 dark:text-slate-400 font-medium h-4">
             {hoveredName ? <span className="text-indigo-500 font-bold">{hoveredName}</span> : "Tap a muscle group to log."}
           </p>
        </div>
        <button onClick={resetWeek} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-red-500 transition-all shadow-sm">
           <RotateCw size={16} />
        </button>
      </div>

      <div className="relative w-full flex flex-col md:flex-row gap-6 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-4 min-h-[450px]">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-20 backdrop-blur-sm"><Loader2 className="animate-spin text-indigo-500" /></div>}
        
        {/* --- LEFT PANEL: Max Fatigue & Recovering --- */}
        <div className="w-full md:w-1/4 flex flex-col gap-4 z-10">
          <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
            <h4 className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Max Fatigue (&lt; 24h)
            </h4>
            <div className="flex flex-wrap gap-1.5">
               {fatigued.length === 0 ? <span className="text-xs text-emerald-600/50 font-medium">None</span> : fatigued.map(m => <span key={m} className="text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded capitalize">{m}</span>)}
            </div>
          </div>
          <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex-1">
            <h4 className="text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-amber-500" /> Recovering (24-48h)
            </h4>
            <div className="flex flex-wrap gap-1.5">
               {recovering.length === 0 ? <span className="text-xs text-amber-600/50 font-medium">None</span> : recovering.map(m => <span key={m} className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded capitalize">{m}</span>)}
            </div>
          </div>
        </div>

        {/* --- CENTER: The Mannequin Map --- */}
        <div className="w-full md:w-2/4 relative flex items-center justify-center py-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest rounded-full backdrop-blur-md transition-all duration-200 pointer-events-none z-20 shadow-xl opacity-0 data-[show=true]:opacity-100 data-[show=true]:translate-y-2" data-show={!!hoveredName}>
                {hoveredName || "Select"}
            </div>
            
            <div className="w-full h-full max-h-[400px]">
               <MuscleMap muscleStatuses={muscleStatuses} onToggle={toggleMuscle} onHover={setHoveredName} />
            </div>
        </div>

        {/* --- RIGHT PANEL: Ready / Prime --- */}
        <div className="w-full md:w-1/4 z-10">
          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 h-full">
            <h4 className="text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-red-600" /> Prime Target (&gt; 48h)
            </h4>
            <div className="flex flex-col gap-1.5">
               {ready.length === 0 ? <span className="text-xs text-red-600/50 font-medium">Full Body Fatigue</span> : ready.map(m => <span key={m} className="text-xs font-bold text-red-700 dark:text-red-300 capitalize border-b border-red-500/10 pb-1">{m}</span>)}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}