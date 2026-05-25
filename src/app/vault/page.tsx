'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database, Plus, Search, Folder, FileText, MoreVertical, Trash2, Edit3, Clock, Command, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import CreateNoteModal from '@/components/CreateNoteModal'
import { format } from 'date-fns'

interface Note {
  id: number
  topic: string
  concept: string
  details: string
  created_at: string
}

export default function VaultPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { 
        e.preventDefault(); setEditingNote(null); setIsModalOpen(true) 
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data, error } = await supabase.from('knowledge').select('*').order('created_at', { ascending: false })
        if (error) throw error
        if (data) setNotes(data)
    } catch (err) {
        console.error("Fetch error:", err)
        setNotes([])
    } finally {
        setLoading(false)
    }
  }

  async function deleteNote(id: number) {
    if (!confirm("Delete this record permanently?")) return
    await supabase.from('knowledge').delete().eq('id', id)
    setMenuOpenId(null)
    fetchNotes()
  }

  function generateAiQuiz() {
    alert("Use the Deep Dive / Training tab for active quizzes!"); 
  }

  const safeNotes = Array.isArray(notes) ? notes : []
  const filteredNotes = safeNotes.filter(n => 
    (n?.concept?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (n?.details?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (n?.topic?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )

  const topics = Array.from(new Set(safeNotes.map(n => n?.topic).filter(Boolean)))

  return (
    <div className="w-full pb-24 md:pb-20 animate-in fade-in duration-700">
      <CreateNoteModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingNote(null) }} onNoteAdded={fetchNotes} initialData={editingNote} />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Database className="text-indigo-600 dark:text-indigo-400" size={32} /> Knowledge Vault
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">Your centralized intelligence repository.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={generateAiQuiz} disabled={generating} className="bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 px-5 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 text-sm md:text-base">
              {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} <span>AI Quiz</span>
            </button>
            <button onClick={() => { setEditingNote(null); setIsModalOpen(true) }} className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 text-sm md:text-base">
              <Plus size={16} /> <span>New Entry</span>
              <div className="hidden md:flex items-center gap-0.5 ml-2 opacity-80 text-[10px] bg-indigo-800 px-1.5 py-0.5 rounded border border-indigo-500"><Command size={10} />K</div>
            </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search entries, keywords, or topics..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <button onClick={() => setSearchQuery('')} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-300 transition-all">
            All
          </button>
          {topics.map(t => (
            <button key={t as string} onClick={() => setSearchQuery(t as string)} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-300 transition-all whitespace-nowrap">
              {t as string}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
           {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
           <FileText size={32} className="text-slate-400 mx-auto mb-3" />
           <p className="text-slate-900 dark:text-white font-bold text-lg mb-1">No records found.</p>
           <p className="text-slate-500 text-sm">Store essential insights, strategies, and intelligence here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNotes.map(note => (
            <div 
              key={note.id} 
              onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
              className={cn(
                  "group relative bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col cursor-pointer",
                  expandedNoteId === note.id ? "h-auto" : "h-[280px]"
              )}
            >
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Folder size={12} className="text-indigo-500" /> {note.topic || 'Uncategorized'}
                  </span>
                </div>
                
                <div className="relative">
                  <button onClick={(e) => {e.stopPropagation(); setMenuOpenId(menuOpenId === note.id ? null : note.id)}} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <MoreVertical size={16} />
                  </button>
                  {menuOpenId === note.id && (
                    <div className="absolute right-0 top-6 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                      <button onClick={(e) => { e.stopPropagation(); setEditingNote(note); setIsModalOpen(true); setMenuOpenId(null) }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><Edit3 size={14}/> Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {note.concept}
              </h3>
              
              {/* 🎯 THE FIX: Text expands smoothly instead of hiding */}
              <div className={cn("text-sm text-slate-600 dark:text-slate-400 relative whitespace-pre-wrap transition-all", expandedNoteId === note.id ? "flex-none overflow-visible pb-4" : "flex-1 overflow-hidden")}>
                {note.details}
                {expandedNoteId !== note.id && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
                <span className="flex items-center gap-1.5"><Clock size={14} /> {note.created_at ? format(new Date(note.created_at), 'MMM d, yyyy') : 'Unknown Date'}</span>
                <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    {expandedNoteId === note.id ? 'Collapse' : 'Expand'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}