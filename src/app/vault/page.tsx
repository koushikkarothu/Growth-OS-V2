'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Search, Plus, Book, Trash2 } from 'lucide-react'
import CreateNoteModal from '@/components/CreateNoteModal'

interface Note {
  id: number
  topic: string
  concept: string
  details: string
}

export default function VaultPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      fetchNotes()
    }
    init()
  }, [])

  async function fetchNotes() {
    const { data } = await supabase
      .from('knowledge')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setNotes(data)
    setLoading(false)
  }

  async function deleteNote(id: number) {
    if (!confirm('Delete this note?')) return
    setNotes(notes.filter(n => n.id !== id))
    await supabase.from('knowledge').delete().eq('id', id)
  }

  // Filter logic
  const filteredNotes = notes.filter(n => 
    n.topic.toLowerCase().includes(search.toLowerCase()) ||
    n.concept.toLowerCase().includes(search.toLowerCase()) ||
    n.details.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto">
      <CreateNoteModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onNoteAdded={fetchNotes} 
      />

      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">📚 Knowledge Vault</h1>
          <p className="text-gray-400">"Your personal library of concepts and mental models."</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-teal-900/20"
        >
          <Plus size={18} />
          Add Note
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input 
          type="text" 
          placeholder="Search your brain (topics, concepts, details)..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-teal-500 outline-none transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
            <p className="text-gray-500">No notes found.</p>
          </div>
        )}

        {filteredNotes.map(note => (
          <div key={note.id} className="group bg-gray-900/50 border border-gray-800 hover:border-teal-500/30 p-5 rounded-xl transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className="bg-teal-500/10 text-teal-400 text-xs px-2 py-1 rounded border border-teal-500/20 uppercase font-bold tracking-wider">
                {note.topic}
              </span>
              <button 
                onClick={() => deleteNote(note.id)}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">{note.concept}</h3>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
              {note.details}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}