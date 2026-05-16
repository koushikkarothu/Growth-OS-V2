'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Target, CheckCircle2, Circle, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Goal {
  id: number
  title: string
  type: 'Weekly' | 'Monthly'
  deadline: string
  status: 'Pending' | 'Done'
}

export default function PlannerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'Weekly' | 'Monthly'>('Weekly')
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [newGoal, setNewGoal] = useState('')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchGoals()
    }
    init()
  }, [])

  async function fetchGoals() {
    const { data } = await supabase.from('goals').select('*').order('deadline', { ascending: true })
    if (data) setGoals(data)
    setLoading(false)
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newGoal) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('goals').insert([{
      user_id: user?.id, title: newGoal, type: activeTab, deadline: deadline || null, status: 'Pending'
    }])
    if (!error) { setNewGoal(''); setDeadline(''); fetchGoals() }
  }

  async function deleteGoal(id: number) {
    if (!confirm("Remove this goal?")) return
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  async function toggleGoal(goal: Goal) {
    const newStatus = goal.status === 'Pending' ? 'Done' : 'Pending'
    await supabase.from('goals').update({ status: newStatus }).eq('id', goal.id)
    fetchGoals()
  }

  const currentGoals = goals.filter(g => g.type === activeTab)

  return (
    <div className="w-full pb-24 md:pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
             <Target className="text-indigo-600 dark:text-indigo-400" size={32} /> Strategic Planner
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">Align your daily actions with your monthly vision.</p>
        </div>
      </header>

      {/* TABS - Enterprise Clean */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-fit mb-8 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('Weekly')}
          className={cn(
            "px-6 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'Weekly' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Calendar size={16} /> Weekly Focus
        </button>
        <button
          onClick={() => setActiveTab('Monthly')}
          className={cn(
            "px-6 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'Monthly' ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Target size={16} /> Monthly Vision
        </button>
      </div>

      {/* INPUT CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-10 shadow-sm">
        <form onSubmit={addGoal} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">New {activeTab} Goal</label>
            <input 
              type="text" 
              placeholder={`What is your main focus for this ${activeTab === 'Weekly' ? 'week' : 'month'}?`}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48 space-y-2">
             <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Deadline</label>
             <input 
              type="date" 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <button 
            type="submit" disabled={!newGoal}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold transition-colors h-[42px] w-full md:w-auto flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={18} /> <span className="md:hidden">Add Goal</span>
          </button>
        </form>
      </div>

      {/* GOALS LIST */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {currentGoals.length === 0 && !loading && (
          <div className="xl:col-span-2 text-center py-16 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <Target className="mx-auto text-slate-400 mb-3" size={32} />
            <p className="text-slate-900 dark:text-white font-bold text-lg mb-1">No active goals.</p>
            <p className="text-slate-500 text-sm">Set your vision for the {activeTab.toLowerCase()}.</p>
          </div>
        )}

        {currentGoals.map(goal => (
          <div key={goal.id} className={cn(
            "group flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-xl border transition-all duration-300 gap-4 shadow-sm",
            goal.status === 'Done' ? "border-slate-200 dark:border-slate-800 opacity-60 grayscale-[20%]" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md"
          )}>
            <div className="flex items-start sm:items-center gap-4">
              <button 
                onClick={() => toggleGoal(goal)}
                className={cn(
                  "shrink-0 mt-0.5 sm:mt-0 transition-colors w-6 h-6 rounded-md flex items-center justify-center border-2",
                  goal.status === 'Done' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-500"
                )}
              >
                {goal.status === 'Done' && <CheckCircle2 size={14} />}
              </button>
              
              <div>
                <h3 className={cn(
                  "text-base font-bold transition-colors leading-snug",
                  goal.status === 'Done' ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                )}>
                  {goal.title}
                </h3>
                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">
                    <Clock size={14} /> 
                    <span>Due {goal.deadline}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end sm:justify-start gap-4 shrink-0 border-t sm:border-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
               {goal.status === 'Done' && (
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md font-bold uppercase tracking-widest border border-emerald-200 dark:border-emerald-500/20">
                  Completed
                </span>
              )}
              <button 
                onClick={() => deleteGoal(goal.id)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                title="Delete Goal"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}