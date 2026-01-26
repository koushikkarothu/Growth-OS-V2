'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Loader2, Zap } from 'lucide-react'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskAdded: () => void
}

interface Skill {
  id: number
  name: string
}

export default function CreateTaskModal({ isOpen, onClose, onTaskAdded }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([]) // Store available skills
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    frequency: 7,
    isTimeGoal: false,
    timeHours: 1,
    linkedSkillId: '' // Track selected skill
  })

  // 1. Fetch Skills when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSkills()
    }
  }, [isOpen])

  async function fetchSkills() {
    const { data } = await supabase
      .from('skills')
      .select('id, name')
      .order('name', { ascending: true })
    
    if (data) setSkills(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    
    // 2. Prepare Data with Linked Skill
    const newTask = {
      user_id: user?.id,
      title: formData.title,
      category: formData.category,
      frequency_goal: formData.isTimeGoal ? 0 : formData.frequency,
      time_goal_minutes: formData.isTimeGoal ? (formData.timeHours * 60) : 0,
      linked_skill_id: formData.linkedSkillId ? parseInt(formData.linkedSkillId) : null // Send ID or null
    }

    const { error } = await supabase.from('tasks').insert([newTask])

    setLoading(false)

    if (error) {
      alert('Error creating task: ' + error.message)
    } else {
      onTaskAdded()
      onClose()
      // Reset form
      setFormData({ 
        title: '', 
        category: 'General', 
        frequency: 7, 
        isTimeGoal: false, 
        timeHours: 1, 
        linkedSkillId: '' 
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">➕ New Mission</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Task Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Deep Work Session" 
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Category</label>
              <select 
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white outline-none"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option>General</option>
                <option>Health</option>
                <option>Work</option>
                <option>Skill</option>
              </select>
            </div>

            {/* SKILL SELECTION DROPDOWN */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-1">
                Link Skill <Zap size={12} className="text-teal-400" />
              </label>
              <select 
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white outline-none"
                value={formData.linkedSkillId}
                onChange={(e) => setFormData({...formData, linkedSkillId: e.target.value})}
              >
                <option value="">None</option>
                {skills.map(skill => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Goal Settings */}
          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Track Time?</label>
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-teal-500 focus:ring-offset-gray-900"
                checked={formData.isTimeGoal}
                onChange={(e) => setFormData({...formData, isTimeGoal: e.target.checked})}
              />
            </div>

            {formData.isTimeGoal ? (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1.5 block">Weekly Goal (Hours)</label>
                <input 
                  type="number" 
                  step="0.5"
                  min="0.5"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  value={formData.timeHours}
                  onChange={(e) => setFormData({...formData, timeHours: parseFloat(e.target.value)})}
                />
              </div>
            ) : (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Frequency</span>
                  <span className="text-teal-400 font-bold">{formData.frequency}x / Week</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="7" 
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: parseInt(e.target.value)})}
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-linear-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Create Task'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}