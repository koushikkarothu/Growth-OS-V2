'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import CreateNoteModal from '@/components/CreateNoteModal'

interface Note { id: number; topic: string; concept: string; details: string }

export default function VaultPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push('/login'); return }
      fetchNotes()
    }
    init()
  }, [])

  async function fetchNotes() {
    const { data } = await supabase.from('knowledge').select('*').order('created_at', { ascending: false })
    if (data) setNotes(data); setLoading(false)
  }

  async function deleteNote(id: number) {
    if (!confirm('Delete note?')) return
    setNotes(notes.filter(n => n.id !== id)); await supabase.from('knowledge').delete().eq('id', id)
  }

  async function generateAiQuiz() {
    alert("Use the Daily Learn tab for quizzes!"); 
  }

  const filteredNotes = notes.filter(n => n.topic.toLowerCase().includes(search.toLowerCase()) || n.concept.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <CreateNoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onNoteAdded={fetchNotes} />

      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Knowledge Vault</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Your personal library of concepts.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={generateAiQuiz} disabled={generating} className="bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2">
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} AI Quiz
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none">
              <Plus size={18} /> Add Note
            </button>
        </div>
      </header>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input type="text" placeholder="Search your brain..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-900/30 outline-none transition-all font-medium shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredNotes.map(note => (
          <div key={note.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md p-6 rounded-3xl transition-all">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/30 uppercase font-bold tracking-wider">{note.topic}</span>
              <button onClick={() => deleteNote(note.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{note.concept}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{note.details}</p>
          </div>
        ))}
      </div>
    </div>
  )
}