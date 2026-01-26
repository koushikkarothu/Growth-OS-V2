'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Zap, Eye, RotateCw, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Note {
  id: number
  topic: string
  concept: string
  details: string
}

export default function ActiveRecallPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  
  // Game State
  const [currentCard, setCurrentCard] = useState<Note | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)

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
    const { data } = await supabase.from('knowledge').select('*')
    
    if (data && data.length > 0) {
      setNotes(data)
      // Pick first random card
      const random = data[Math.floor(Math.random() * data.length)]
      setCurrentCard(random)
    }
    setLoading(false)
  }

  function nextCard() {
    if (notes.length === 0) return
    setIsRevealed(false)
    
    // Simple random selection
    // (Improvement idea: Don't pick the same card twice in a row)
    let next = notes[Math.floor(Math.random() * notes.length)]
    
    // Retry once if we got the exact same card to keep it fresh
    if (notes.length > 1 && next.id === currentCard?.id) {
      next = notes[Math.floor(Math.random() * notes.length)]
    }
    
    setCurrentCard(next)
  }

  return (
    <div className="max-w-3xl mx-auto h-[80vh] flex flex-col">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Brain className="text-pink-500" size={32} />
          Active Recall
        </h1>
        <p className="text-gray-400">"Test your knowledge. Strengthen your neural pathways."</p>
      </header>

      {/* LOADING / EMPTY STATES */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-500 animate-pulse">
          Loading your brain...
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-500 mb-4">Your Knowledge Vault is empty.</p>
          <button 
            onClick={() => router.push('/vault')}
            className="text-teal-400 hover:text-teal-300 font-medium hover:underline"
          >
            Go add some notes first!
          </button>
        </div>
      )}

      {/* THE FLASHCARD */}
      {!loading && currentCard && (
        <div className="flex-1 flex flex-col relative group perspective">
          
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-500">
            
            {/* Background Glow */}
            <div className={cn(
              "absolute inset-0 opacity-10 transition-colors duration-500",
              isRevealed ? "bg-teal-500" : "bg-purple-500"
            )} />

            {/* Topic Badge */}
            <span className="mb-6 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/30 text-gray-300 border border-white/10 z-10">
              {currentCard.topic}
            </span>

            {/* Question / Concept */}
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 z-10">
              {currentCard.concept}
            </h2>

            {/* The Answer (Hidden/Revealed) */}
            <div className={cn(
              "w-full transition-all duration-500 ease-in-out z-10",
              isRevealed 
                ? "opacity-100 translate-y-0 max-h-96" 
                : "opacity-0 translate-y-4 max-h-0 overflow-hidden"
            )}>
              <div className="bg-black/20 rounded-xl p-6 text-gray-200 text-lg leading-relaxed whitespace-pre-wrap border border-white/5">
                {currentCard.details}
              </div>
            </div>

          </div>

          {/* CONTROLS */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            {!isRevealed ? (
              <button 
                onClick={() => setIsRevealed(true)}
                className="col-span-2 bg-gray-800 hover:bg-gray-700 text-white text-lg font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Eye size={24} />
                Reveal Answer
              </button>
            ) : (
              <>
                <button 
                  onClick={nextCard} // In a real app, this could be "Forgot"
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-4 rounded-xl transition-all"
                >
                  Did not know
                </button>
                <button 
                  onClick={nextCard} // In a real app, this updates spaced repetition score
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2"
                >
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