'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Target, CheckCircle2, Circle, Trash2, Clock, ChevronRight } from 'lucide-react'
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
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Strategic Planner</h1>
        <p className="text-slate-500 font-medium">Align your daily actions with your monthly vision.</p>
      </header>

      {/* TABS */}
      <div className="flex p-1.5 bg-white border border-slate-200 rounded-2xl w-fit mb-8 shadow-sm">
        <button
          onClick={() => setActiveTab('Weekly')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'Weekly' ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <Calendar size={16} /> Weekly Focus
        </button>
        <button
          onClick={() => setActiveTab('Monthly')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'Monthly' ? "bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <Target size={16} /> Monthly Vision
        </button>
      </div>

      {/* INPUT CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-10 shadow-sm">
        <form onSubmit={addGoal} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">New {activeTab} Goal</label>
            <input 
              type="text" 
              placeholder={`What is your main focus for this ${activeTab === 'Weekly' ? 'week' : 'month'}?`}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48 space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Deadline</label>
             <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all h-[52px] w-full md:w-[52px] flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={24} />
          </button>
        </form>
      </div>

      {/* GOALS LIST */}
      <div className="space-y-4">
        {currentGoals.length === 0 && !loading && (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Target className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500 font-medium">No active goals. Set your vision.</p>
          </div>
        )}

        {currentGoals.map(goal => (
          <div key={goal.id} className="group flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
            <div className="flex items-center gap-5">
              <button 
                onClick={() => toggleGoal(goal)}
                className={cn(
                  "transition-all transform active:scale-90",
                  goal.status === 'Done' ? "text-emerald-500" : "text-slate-300 hover:text-indigo-500"
                )}
              >
                {goal.status === 'Done' ? <CheckCircle2 size={26} /> : <Circle size={26} strokeWidth={2} />}
              </button>
              
              <div>
                <h3 className={cn(
                  "text-lg font-bold transition-all",
                  goal.status === 'Done' ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800"
                )}>
                  {goal.title}
                </h3>
                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mt-1">
                    <Clock size={12} /> 
                    <span>Due {goal.deadline}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               {goal.status === 'Done' && (
                <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-100">
                  Completed
                </span>
              )}
              <button 
                onClick={() => deleteGoal(goal.id)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
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