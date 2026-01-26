'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Loader2, Zap, Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskAdded: () => void
  initialData?: any 
}

interface Skill { id: number; name: string }

export default function CreateTaskModal({ isOpen, onClose, onTaskAdded, initialData }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  
  const [formData, setFormData] = useState({
    title: '', category: 'General', frequency: 7, isTimeGoal: false, timeHours: 1, linkedSkillId: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchSkills()
      if (initialData) {
        setFormData({
          title: initialData.title,
          category: initialData.category,
          frequency: initialData.frequency_goal || 7,
          isTimeGoal: initialData.time_goal_minutes > 0,
          // Convert minutes to hours for display
          timeHours: initialData.time_goal_minutes > 0 ? (initialData.time_goal_minutes / 60) : 1,
          linkedSkillId: initialData.linked_skill_id || ''
        })
      } else {
        setFormData({ title: '', category: 'General', frequency: 7, isTimeGoal: false, timeHours: 1, linkedSkillId: '' })
      }
    }
  }, [isOpen, initialData])

  async function fetchSkills() {
    const { data } = await supabase.from('skills').select('id, name').order('name', { ascending: true })
    if (data) setSkills(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const taskData = {
      user_id: user?.id,
      title: formData.title,
      category: formData.category,
      frequency_goal: formData.isTimeGoal ? 0 : formData.frequency,
      // Store TOTAL WEEKLY MINUTES
      time_goal_minutes: formData.isTimeGoal ? (formData.timeHours * 60) : 0,
      linked_skill_id: formData.linkedSkillId ? parseInt(formData.linkedSkillId) : null
    }

    let error;
    if (initialData) {
      const { error: uErr } = await supabase.from('tasks').update(taskData).eq('id', initialData.id)
      error = uErr
    } else {
      const { error: iErr } = await supabase.from('tasks').insert([taskData])
      error = iErr
    }

    setLoading(false)
    if (error) alert('Error: ' + error.message)
    else { onTaskAdded(); onClose() }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl shadow-indigo-900/10 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Mission' : 'New Mission'}</h2>
            <p className="text-sm text-slate-500">Define your objective.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mission Title</label>
            <input type="text" required placeholder="e.g. Deep Work Session" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <div className="relative">
                <select className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option>General</option><option>Health</option><option>Work</option><option>Skill</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">Link XP <Zap size={12} className="text-amber-500 fill-amber-500"/></label>
              <div className="relative">
                <select className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none" value={formData.linkedSkillId} onChange={(e) => setFormData({...formData, linkedSkillId: e.target.value})}>
                  <option value="">No Skill Linked</option>
                  {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", formData.isTimeGoal ? "bg-indigo-100 text-indigo-600" : "bg-white text-slate-400 border border-slate-200")}>
                  {formData.isTimeGoal ? <Clock size={20} /> : <Calendar size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{formData.isTimeGoal ? "Time Bucket" : "Habit Frequency"}</p>
                  <p className="text-xs text-slate-500">{formData.isTimeGoal ? "Log minutes to fill weekly bucket" : "Complete specific times per week"}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.isTimeGoal} onChange={(e) => setFormData({...formData, isTimeGoal: e.target.checked})}/>
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>

            <div className="pt-2 animate-in slide-in-from-top-1">
              {formData.isTimeGoal ? (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                    <span>Total Weekly Target</span>
                    <span className="text-indigo-600">{formData.timeHours} Hours / Week</span>
                  </div>
                  <input type="number" step="0.5" min="0.5" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:border-indigo-500 outline-none" value={formData.timeHours} onChange={(e) => setFormData({...formData, timeHours: parseFloat(e.target.value)})}/>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                    <span>Weekly Frequency</span>
                    <span className="text-indigo-600">{formData.frequency}x / Week</span>
                  </div>
                  <input type="range" min="1" max="7" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: parseInt(e.target.value)})}/>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium px-1"><span>1x</span><span>2x</span><span>3x</span><span>4x</span><span>5x</span><span>6x</span><span>Daily</span></div>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : (initialData ? 'Save Changes' : 'Create Mission')}
          </button>
        </form>
      </div>
    </div>
  )
}