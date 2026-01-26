'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Loader2, BookOpen } from 'lucide-react'

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onNoteAdded: () => void
}

export default function CreateNoteModal({ isOpen, onClose, onNoteAdded }: CreateNoteModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    topic: '',
    concept: '',
    details: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const newNote = {
      user_id: user?.id,
      topic: formData.topic,
      concept: formData.concept,
      details: formData.details
    }

    const { error } = await supabase.from('knowledge').insert([newNote])

    setLoading(false)

    if (error) {
      alert('Error saving note: ' + error.message)
    } else {
      onNoteAdded()
      onClose()
      setFormData({ topic: '', concept: '', details: '' })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-teal-400" />
            Add Knowledge
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Topic</label>
              <input 
                type="text" 
                required
                placeholder="e.g. React"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-teal-500 outline-none"
                value={formData.topic}
                onChange={(e) => setFormData({...formData, topic: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Concept (Front)</label>
              <input 
                type="text" 
                required
                placeholder="e.g. useEffect Hook"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-teal-500 outline-none"
                value={formData.concept}
                onChange={(e) => setFormData({...formData, concept: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Details (Back of Card)</label>
            <textarea 
              required
              rows={5}
              placeholder="Explain the concept in your own words..."
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:border-teal-500 outline-none resize-none"
              value={formData.details}
              onChange={(e) => setFormData({...formData, details: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Save Note'}
          </button>

        </form>
      </div>
    </div>
  )
}