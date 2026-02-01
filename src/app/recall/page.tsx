'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Eye, RotateCw, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Note { id: number; topic: string; concept: string; details: string }

export default function ActiveRecallPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [currentCard, setCurrentCard] = useState<Note | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push('/login'); return }
      fetchNotes()
    }
    init()
  }, [])

  async function fetchNotes() {
    const { data } = await supabase.from('knowledge').select('*')
    if (data && data.length > 0) {
      setNotes(data)
      setCurrentCard(data[Math.floor(Math.random() * data.length)])
    }
    setLoading(false)
  }

  function nextCard() {
    if (notes.length === 0) return
    setIsRevealed(false)
    let next = notes[Math.floor(Math.random() * notes.length)]
    if (notes.length > 1 && next.id === currentCard?.id) {
      next = notes[Math.floor(Math.random() * notes.length)]
    }
    setCurrentCard(next)
  }

  return (
    <div className="max-w-3xl mx-auto h-[85vh] flex flex-col pb-10 animate-in fade-in duration-500">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-3">
          <Brain className="text-indigo-600 dark:text-indigo-400" size={32} />
          Active Recall
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Test your knowledge. Strengthen your neural pathways.</p>
      </header>

      {/* LOADING / EMPTY STATES */}
      {loading && <div className="flex-1 flex items-center justify-center text-slate-400 font-medium animate-pulse">Loading your brain...</div>}

      {!loading && notes.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-slate-500 dark:text-slate-400 mb-4 font-medium">Your Knowledge Vault is empty.</p>
          <button onClick={() => router.push('/vault')} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold hover:underline">Go add some notes first!</button>
        </div>
      )}

      {/* THE FLASHCARD */}
      {!loading && currentCard && (
        <div className="flex-1 flex flex-col relative group perspective">
          
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 md:p-16 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-500">
            
            <div className={cn("absolute inset-0 opacity-[0.03] dark:opacity-[0.1] transition-colors duration-500 pointer-events-none", isRevealed ? "bg-indigo-600" : "bg-slate-900 dark:bg-indigo-900")} />
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />

            <span className="mb-8 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 z-10">
              {currentCard.topic}
            </span>

            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-10 z-10 leading-tight">
              {currentCard.concept}
            </h2>

            <div className={cn("w-full transition-all duration-500 ease-in-out z-10", isRevealed ? "opacity-100 translate-y-0 max-h-96" : "opacity-0 translate-y-4 max-h-0 overflow-hidden")}>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 text-slate-700 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap border border-slate-100 dark:border-slate-700 shadow-inner">
                {currentCard.details}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {!isRevealed ? (
              <button onClick={() => setIsRevealed(true)} className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-lg font-bold py-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 group">
                <Eye size={24} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                Reveal Answer
              </button>
            ) : (
              <>
                <button onClick={nextCard} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 font-bold py-4 rounded-2xl transition-all">
                  Hard
                </button>
                <button onClick={nextCard} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 active:scale-95">
                  <RotateCw size={20} />
                  Next Card
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}