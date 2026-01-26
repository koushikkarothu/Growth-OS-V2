'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Loader2, BookOpen } from 'lucide-react'

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onNoteAdded: () => void
  initialData?: { topic: string, concept: string, details: string } | null
}

export default function CreateNoteModal({ isOpen, onClose, onNoteAdded, initialData }: CreateNoteModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ topic: '', concept: '', details: '' })

  useEffect(() => {
    if (isOpen && initialData) setFormData(initialData)
    else if (isOpen && !initialData) setFormData({ topic: '', concept: '', details: '' })
  }, [isOpen, initialData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('knowledge').insert([{ ...formData, user_id: user?.id }])
    setLoading(false)
    if (!error) { onNoteAdded(); onClose(); setFormData({ topic: '', concept: '', details: '' }) }
    else alert(error.message)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600" />
              {initialData ? 'Save Concept' : 'Add Knowledge'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topic</label>
              <input type="text" required placeholder="e.g. React" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concept</label>
              <input type="text" required placeholder="e.g. Hooks" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formData.concept} onChange={(e) => setFormData({...formData, concept: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Details</label>
            <textarea required rows={6} placeholder="Explain the concept..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none" value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : 'Save Note'}
          </button>
        </form>
      </div>
    </div>
  )
}