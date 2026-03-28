'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BrainCircuit, Sparkles, ArrowRight, ArrowLeft, RefreshCcw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Vocab {
  id: number; word: string; translation?: string; definition?: string; 
  word_type?: string; gender?: string; plural_form?: string; conjugation?: string;
  mastery_level?: number;
}

export default function ActiveRecallPage() {
  const [langMode, setLangMode] = useState<'en' | 'de'>('de')
  const [deck, setDeck] = useState<Vocab[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  
  // AI Memory Hook State
  const [isFetchingHook, setIsFetchingHook] = useState(false)
  const [aiHook, setAiHook] = useState<{ emoji: string, sentence: string } | null>(null)

  useEffect(() => { 
      fetchDeck();
      resetCardState();
  }, [langMode])

  async function fetchDeck() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    // Fetch words, ordering randomly or by lowest mastery first (if we use mastery later)
    const { data } = await supabase.from(tableName).select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    
    if (data) {
        // Simple shuffle for the flashcard deck
        const shuffled = data.sort(() => 0.5 - Math.random())
        setDeck(shuffled)
    }
  }

  const resetCardState = () => {
      setIsFlipped(false)
      setAiHook(null)
      setIsFetchingHook(false)
  }

  const nextCard = () => {
      if (currentIndex < deck.length - 1) {
          setCurrentIndex(prev => prev + 1)
          resetCardState()
      }
  }

  const prevCard = () => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1)
          resetCardState()
      }
  }

  const getGenderColor = (g?: string) => {
      if (g === 'der') return "text-blue-500"
      if (g === 'die') return "text-red-500"
      if (g === 'das') return "text-emerald-500"
      return "text-slate-400"
  }

  // --- 🧠 THE NEURAL HOOK PROTOCOL ---
  async function generateMemoryHook() {
      const currentWord = deck[currentIndex]
      if (!currentWord) return
      
      setIsFetchingHook(true)
      
      const targetWord = currentWord.word
      const meaning = currentWord.translation || currentWord.definition
      
      const customPrompt = `You are a memory expert helping a student memorize vocabulary.
      Create a mnemonic device for the ${langMode === 'de' ? 'German' : 'English'} word "${targetWord}" which means "${meaning}".
      
      Rules:
      1. Provide exactly ONE highly relevant emoji.
      2. Write ONE short, bizarre, and funny English sentence linking the sound of the word to its meaning. 
      
      Format strictly like this:
      EMOJI: [emoji]
      HOOK: [your sentence]`

      try {
        const res = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
        })
        const data = await res.json()
        
        if (data.analysis) {
            // Parse the AI response
            const text = data.analysis;
            const emojiMatch = text.match(/EMOJI:\s*(.+)/);
            const hookMatch = text.match(/HOOK:\s*(.+)/);
            
            setAiHook({
                emoji: emojiMatch ? emojiMatch[1] : '🧠',
                sentence: hookMatch ? hookMatch[1] : text.replace('### 🤖 AI Analysis\n', '')
            })
        }
      } catch(e) {
          setAiHook({ emoji: '⚠️', sentence: "Failed to generate neural hook." })
      }
      setIsFetchingHook(false)
  }

  if (deck.length === 0) {
      return (
          <div className="max-w-4xl mx-auto py-20 px-4 text-center">
              <h2 className="text-2xl font-bold text-slate-400 mb-4">Vault is Empty</h2>
              <p className="text-slate-500">Go to the Learning Theater or Language Coach to add some vocabulary first.</p>
              <div className="flex justify-center mt-8 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit mx-auto">
                 <button onClick={() => setLangMode('en')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-white")}>🇬🇧 English</button>
                 <button onClick={() => setLangMode('de')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'de' ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-white")}>🇩🇪 Deutsch</button>
              </div>
          </div>
      )
  }

  const currentCard = deck[currentIndex]

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BrainCircuit className="text-indigo-600" size={36} /> Active Recall
          </h1>
          <p className="text-slate-500 font-medium mt-2">Flip cards. Forge neural pathways. Defy the forgetting curve.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl shrink-0">
           <button onClick={() => setLangMode('en')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-white")}>🇬🇧 English</button>
           <button onClick={() => setLangMode('de')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'de' ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-white")}>🇩🇪 Deutsch</button>
        </div>
      </header>

      {/* PROGRESS BAR */}
      <div className="mb-8">
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Card {currentIndex + 1} of {deck.length}</span>
              <span>{Math.round(((currentIndex + 1) / deck.length) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }} />
          </div>
      </div>

      {/* THE FLASHCARD */}
      <div className="relative w-full h-[400px] md:h-[450px] perspective-1000 group">
          <div className={cn(
              "w-full h-full transition-all duration-500 transform-style-3d cursor-pointer shadow-2xl rounded-[3rem]",
              isFlipped ? "rotate-y-180" : ""
          )} onClick={() => !isFlipped && setIsFlipped(true)}>
              
              {/* FRONT OF CARD (The Question) */}
              <div className={cn(
                  "absolute inset-0 backface-hidden bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center",
                  !isFlipped ? "z-20" : "z-0"
              )}>
                 <span className="absolute top-8 text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                     {currentCard.word_type || "Vocabulary"}
                 </span>
                 
                 {/* Visual Emoji representation if already fetched, otherwise a brain */}
                 <div className="text-6xl mb-6">{aiHook ? aiHook.emoji : '🧠'}</div>
                 
                 <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                    {langMode === 'de' && currentCard.gender && (
                        <span className={cn("mr-3", getGenderColor(currentCard.gender))}>{currentCard.gender}</span>
                    )}
                    {currentCard.word}
                 </h2>
                 <p className="absolute bottom-8 text-slate-400 font-bold animate-pulse flex items-center gap-2">
                    <RefreshCcw size={16} /> Tap to reveal
                 </p>
              </div>

              {/* BACK OF CARD (The Answer & Memory Hook) */}
              <div className={cn(
                  "absolute inset-0 backface-hidden rotate-y-180 bg-indigo-50 dark:bg-indigo-950/30 rounded-[3rem] border-2 border-indigo-200 dark:border-indigo-900/50 flex flex-col items-center justify-center p-8 text-center overflow-hidden",
                  isFlipped ? "z-20" : "z-0"
              )}>
                 <h3 className="text-3xl md:text-5xl font-black text-indigo-900 dark:text-indigo-100 mb-6">
                    {currentCard.translation || currentCard.definition}
                 </h3>

                 {/* Extra Grammar Info */}
                 {(currentCard.plural_form || currentCard.conjugation) && (
                     <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl w-full max-w-sm text-sm font-medium text-slate-700 dark:text-slate-300 mb-6 border border-indigo-100 dark:border-indigo-800/50">
                         {currentCard.plural_form && <div className="mb-1"><span className="font-bold text-indigo-500 mr-2">Plural:</span> {currentCard.plural_form}</div>}
                         {currentCard.conjugation && <div><span className="font-bold text-indigo-500 mr-2">Conj:</span> {currentCard.conjugation}</div>}
                     </div>
                 )}

                 {/* THE AI NEURAL HOOK SECTION */}
                 <div className="w-full max-w-md mt-auto">
                     {!aiHook ? (
                         <button 
                            onClick={(e) => { e.stopPropagation(); generateMemoryHook(); }}
                            disabled={isFetchingHook}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                         >
                            <Sparkles size={18} className={isFetchingHook ? "animate-spin" : ""} /> 
                            {isFetchingHook ? "Forging Mnemonic..." : "Generate Neural Hook"}
                         </button>
                     ) : (
                         <div className="bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-5 rounded-2xl animate-in zoom-in-95">
                             <div className="text-4xl mb-3">{aiHook.emoji}</div>
                             <p className="text-amber-900 dark:text-amber-200 font-bold text-sm leading-relaxed">
                                 {aiHook.sentence}
                             </p>
                         </div>
                     )}
                 </div>
              </div>

          </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center justify-center gap-6 mt-10">
          <button onClick={prevCard} disabled={currentIndex === 0} className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 transition-all shadow-sm">
             <ArrowLeft size={24} />
          </button>
          
          <button onClick={() => setIsFlipped(!isFlipped)} className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-widest uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
             Flip Card
          </button>

          <button onClick={nextCard} disabled={currentIndex === deck.length - 1} className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 transition-all shadow-sm">
             <ArrowRight size={24} />
          </button>
      </div>

      {/* Custom CSS for 3D Flip (Add this to your globals.css if you haven't already, or it works fine without it by just snapping) */}
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />

    </div>
  )
}