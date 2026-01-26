'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Target, CheckCircle2, Circle } from 'lucide-react'
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

  // 1. Check Auth & Fetch Data
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      fetchGoals()
    }
    init()
  }, [])

  async function fetchGoals() {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('deadline', { ascending: true })
    
    if (data) setGoals(data)
    setLoading(false)
  }

  // 2. Add New Goal
  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newGoal) return

    const { data: { user } } = await supabase.auth.getUser()

    const newEntry = {
      user_id: user?.id,
      title: newGoal,
      type: activeTab, // Uses the currently selected tab
      deadline: deadline || null,
      status: 'Pending'
    }

    // Optimistic Update (Show it instantly)
    const tempId = Math.random()
    setGoals([...goals, { ...newEntry, id: tempId, status: 'Pending' } as Goal])
    setNewGoal('')
    setDeadline('')

    // Save to DB
    const { error } = await supabase.from('goals').insert([newEntry])
    if (error) {
      alert('Error saving goal')
      fetchGoals() // Revert on error
    } else {
      fetchGoals() // Refresh to get real ID
    }
  }

  // 3. Toggle Complete
  async function toggleGoal(goal: Goal) {
    const newStatus = goal.status === 'Pending' ? 'Done' : 'Pending'
    
    // Update UI
    setGoals(goals.map(g => g.id === goal.id ? { ...g, status: newStatus } : g))

    // Update DB
    await supabase.from('goals').update({ status: newStatus }).eq('id', goal.id)
  }

  // Filter goals based on the active tab
  const currentGoals = goals.filter(g => g.type === activeTab)

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🗓️ Strategic Planner</h1>
        <p className="text-gray-400">"A goal without a plan is just a wish."</p>
      </header>

      {/* TABS COMPONENT */}
      <div className="flex p-1 bg-gray-900 border border-gray-800 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('Weekly')}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'Weekly' ? "bg-teal-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
          )}
        >
          <Calendar size={16} />
          Weekly Focus
        </button>
        <button
          onClick={() => setActiveTab('Monthly')}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
            activeTab === 'Monthly' ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
          )}
        >
          <Target size={16} />
          Monthly Vision
        </button>
      </div>

      {/* INPUT FORM */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-8">
        <form onSubmit={addGoal} className="flex gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase ml-1">New {activeTab} Goal</label>
            <input 
              type="text" 
              placeholder={`What is your main focus for this ${activeTab === 'Weekly' ? 'week' : 'month'}?`}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
            />
          </div>
          <div className="w-40 space-y-1">
             <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Deadline</label>
             <input 
              type="date" 
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-3 text-gray-300 focus:border-teal-500 outline-none"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="bg-teal-600 hover:bg-teal-500 text-white p-3 rounded-lg transition-colors h-[50px] w-[50px] flex items-center justify-center"
          >
            <Plus size={24} />
          </button>
        </form>
      </div>

      {/* GOALS LIST */}
      <div className="space-y-3">
        {currentGoals.length === 0 && !loading && (
          <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
            <p className="text-gray-500">No active goals. Set your vision.</p>
          </div>
        )}

        {currentGoals.map(goal => (
          <div key={goal.id} className="group flex items-center justify-between bg-gray-800/30 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-all">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => toggleGoal(goal)}
                className={cn(
                  "transition-colors",
                  goal.status === 'Done' ? "text-teal-500" : "text-gray-600 hover:text-teal-500"
                )}
              >
                {goal.status === 'Done' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </button>
              
              <div>
                <h3 className={cn(
                  "text-lg font-medium transition-all",
                  goal.status === 'Done' ? "text-gray-600 line-through" : "text-gray-200"
                )}>
                  {goal.title}
                </h3>
                {goal.deadline && (
                  <p className="text-xs text-gray-500 mt-1">Due: {goal.deadline}</p>
                )}
              </div>
            </div>
            
            {goal.status === 'Done' && (
              <span className="text-xs bg-teal-500/10 text-teal-500 px-3 py-1 rounded-full font-medium">
                Completed
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}