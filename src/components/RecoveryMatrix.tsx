'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Moon, Battery, Activity, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RecoveryMatrix() {
  const [loading, setLoading] = useState(true)
  const [strainScore, setStrainScore] = useState(0) // Number of muscles trained
  const [targetSleep, setTargetSleep] = useState(7) // Base 7 + Strain
  const [loggedSleep, setLoggedSleep] = useState<number | null>(null)
  
  const [sleepInput, setSleepInput] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchRecoveryData()
  }, [])

  async function fetchRecoveryData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Get Strain (How many muscles are currently green?)
    const { data: muscles } = await supabase.from('muscle_tracker').select('*').eq('user_id', user.id)
    const muscleCount = muscles?.length || 0
    setStrainScore(muscleCount)
    
    // Formula: 7 hours base + 15 mins (0.25h) per muscle group trained
    const calculatedTarget = 7 + (muscleCount * 0.25)
    setTargetSleep(calculatedTarget)

    // 2. Get Today's Sleep Log
    const today = new Date().toISOString().split('T')[0]
    const { data: sleepData } = await supabase.from('sleep_logs').select('hours_slept').eq('user_id', user.id).eq('date', today).single()
    
    if (sleepData) {
      setLoggedSleep(sleepData.hours_slept)
    }
    
    setLoading(false)
  }

  async function saveSleep(e: React.FormEvent) {
    e.preventDefault()
    if (!sleepInput || isNaN(Number(sleepInput))) return

    setIsSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().split('T')[0]
    const hours = parseFloat(sleepInput)

    // Upsert (Insert or Update if exists)
    const { error } = await supabase.from('sleep_logs').upsert({ 
      user_id: user?.id, 
      date: today, 
      hours_slept: hours 
    }, { onConflict: 'user_id, date' })

    if (!error) {
      setLoggedSleep(hours)
      setSleepInput('')
    }
    setIsSaving(false)
  }

  // Ring Chart Calculations
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const sleepAmount = loggedSleep || 0
  const percentage = Math.min((sleepAmount / targetSleep) * 100, 100)
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const isRecovered = sleepAmount >= targetSleep

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
      {/* Background glow based on recovery status */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 transition-colors duration-700",
        isRecovered ? "bg-emerald-500" : "bg-indigo-500"
      )} />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Moon size={20} className={isRecovered ? "text-emerald-400" : "text-indigo-400"} /> 
          Recovery Matrix
        </h3>
        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
          <Activity size={14} className="text-orange-400" />
          <span className="text-slate-300">Strain:</span> <span className="text-orange-400">{strainScore}</span>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" /></div>
      ) : (
        <div className="relative z-10">
          
          <div className="flex items-center gap-6 mb-8">
            {/* SVG Ring Chart */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r={radius} className="stroke-slate-800" strokeWidth="8" fill="transparent" />
                {/* Progress Ring */}
                <circle 
                  cx="50" cy="50" r={radius} 
                  className={cn("transition-all duration-1000 ease-out", isRecovered ? "stroke-emerald-400" : "stroke-indigo-500")}
                  strokeWidth="8" fill="transparent" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold">{sleepAmount || '0'}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hours</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 space-y-3">
               <div>
                 <div className="flex justify-between text-xs text-slate-400 font-medium mb-1">
                   <span>Base Need</span>
                   <span>7.0h</span>
                 </div>
                 <div className="flex justify-between text-xs text-orange-400 font-medium mb-1">
                   <span>Strain Penalty</span>
                   <span>+{strainScore * 0.25}h</span>
                 </div>
                 <div className="w-full h-px bg-slate-700 my-1.5" />
                 <div className="flex justify-between text-sm font-bold text-white">
                   <span>Target Rest</span>
                   <span>{targetSleep}h</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Logging Input */}
          {!isRecovered ? (
            <form onSubmit={saveSleep} className="flex gap-2">
              <input 
                type="number" step="0.5" min="0" max="24"
                placeholder="Hours slept..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                value={sleepInput}
                onChange={(e) => setSleepInput(e.target.value)}
              />
              <button 
                type="submit" disabled={isSaving || !sleepInput}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-6 rounded-xl font-bold transition-all flex items-center justify-center"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Log'}
              </button>
            </form>
          ) : (
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={18} /> Fully Recovered
            </div>
          )}

        </div>
      )}
    </div>
  )
}