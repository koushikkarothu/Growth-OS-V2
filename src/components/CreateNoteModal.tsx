'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Save, BookOpen, Loader2 } from 'lucide-react'

export default function CreateNoteModal({ isOpen, onClose, onNoteAdded, initialData }: any) {
  const [topic, setTopic] = useState('')
  const [concept, setConcept] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setTopic(initialData.topic || '')
      setConcept(initialData.concept || '')
      setDetails(initialData.details || '')
    } else {
      setTopic(''); setConcept(''); setDetails('')
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Authentication error: No user found.")

      const payload = { user_id: user.id, topic, concept, details }

      if (initialData) {
        const { error } = await supabase.from('knowledge').update(payload).eq('id', initialData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('knowledge').insert([payload])
        if (error) throw error
      }

      onNoteAdded()
      onClose()
    } catch (err: any) {
      console.error("Vault Save Error:", err)
      alert("System Error: Failed to save record to the Vault. " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-indigo-600 dark:text-indigo-400" size={20} />
            {initialData ? 'Edit Entry' : 'New Vault Entry'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Topic (Folder)</label>
              <input 
                type="text" required value={topic} onChange={e => setTopic(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                placeholder="e.g. React, Hardware, Finances"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Concept (Title)</label>
              <input 
                type="text" required value={concept} onChange={e => setConcept(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                placeholder="e.g. Hooks, ESP32 Setup"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Details</label>
            <textarea 
              required value={details} onChange={e => setDetails(e.target.value)}
              className="w-full min-h-[200px] flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all resize-none custom-scrollbar leading-relaxed"
              placeholder="Explain the concept..."
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
           <button disabled={loading} type="submit" onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
             {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
             {initialData ? 'Update Record' : 'Save Note'}
           </button>
        </div>

      </div>
    </div>
  )
}