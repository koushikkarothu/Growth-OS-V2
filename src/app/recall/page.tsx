'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BrainCircuit, Sparkles, RefreshCcw, ThumbsDown, ThumbsUp, CheckCircle2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Vocab {
  id: number; word: string; translation?: string; definition?: string; 
  word_type?: string; gender?: string; plural_form?: string; conjugation?: string;
  interval: number; repetition: number; efactor: number; next_review: string;
}

export default function ActiveRecallPage() {
  const [langMode, setLangMode] = useState<'en' | 'de'>('de')
  const [deck, setDeck] = useState<Vocab[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // AI Memory Hook State
  const [isFetchingHook, setIsFetchingHook] = useState(false)
  const [aiHook, setAiHook] = useState<{ emoji: string, sentence: string } | null>(null)

  useEffect(() => { 
      setIsLoading(true);
      fetchDeck();
      resetCardState();
  }, [langMode])

  async function fetchDeck() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    const today = new Date().toISOString()

    // 🎯 NEW: Fetch ONLY cards scheduled for today or earlier
    const { data } = await supabase.from(tableName)
        .select('*')
        .eq('user_id', user.id)
        .lte('next_review', today) 
        .order('next_review', { ascending: true })
    
    if (data) setDeck(data)
    setIsLoading(false)
  }

  const resetCardState = () => {
      setIsFlipped(false)
      setAiHook(null)
      setIsFetchingHook(false)
  }

  // 🎯 NEW: SuperMemo-2 Spaced Repetition Algorithm
  async function processReview(grade: number) {
      const card = deck[currentIndex]
      
      // Defaults in case the DB is fresh
      let interval = card.interval || 0;
      let repetition = card.repetition || 0;
      let efactor = card.efactor || 2.5;

      // Grade 1 = Hard/Again, Grade 4 = Good, Grade 5 = Easy
      if (grade >= 3) {
          if (repetition === 0) interval = 1;
          else if (repetition === 1) interval = 6;
          else interval = Math.round(interval * efactor);
          repetition += 1;
      } else {
          repetition = 0;
          interval = 1;
      }

      efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
      if (efactor < 1.3) efactor = 1.3;

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      // Save to DB
      const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
      await supabase.from(tableName).update({
          interval, repetition, efactor, next_review: nextReview.toISOString()
      }).eq('id', card.id)

      // Move to next card
      if (currentIndex < deck.length - 1) {
          setCurrentIndex(prev => prev + 1)
          resetCardState()
      } else {
          // Finished deck!
          setDeck([])
      }
  }

  const getGenderColor = (g?: string) => {
      if (g === 'der') return "text-blue-500"
      if (g === 'die') return "text-red-500"
      if (g === 'das') return "text-emerald-500"
      return "text-slate-400"
  }

  async function generateMemoryHook() {
      const currentWord = deck[currentIndex]
      if (!currentWord) return
      setIsFetchingHook(true)
      
      const targetWord = currentWord.word
      const meaning = currentWord.translation || currentWord.definition
      const customPrompt = `You are a memory expert helping a student memorize vocabulary. Create a mnemonic device for the ${langMode === 'de' ? 'German' : 'English'} word "${targetWord}" which means "${meaning}". Rules: 1. Provide exactly ONE highly relevant emoji. 2. Write ONE short, bizarre, and funny English sentence linking the sound of the word to its meaning. Format strictly like this: EMOJI: [emoji] HOOK: [your sentence]`

      try {
        const res = await fetch('/api/analyze-video', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
        })
        const data = await res.json()
        if (data.analysis) {
            const text = data.analysis;
            const emojiMatch = text.match(/EMOJI:\s*(.+)/);
            const hookMatch = text.match(/HOOK:\s*(.+)/);
            setAiHook({ emoji: emojiMatch ? emojiMatch[1] : '🧠', sentence: hookMatch ? hookMatch[1] : text.replace('### 🤖 AI Analysis\n', '') })
        }
      } catch(e) { setAiHook({ emoji: '⚠️', sentence: "Failed to generate neural hook." }) }
      setIsFetchingHook(false)
  }

  if (isLoading) return <div className="py-20 text-center text-slate-500 animate-pulse">Scanning Neural Pathways...</div>

  if (deck.length === 0) {
      return (
          <div className="max-w-4xl mx-auto py-20 px-4 text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">All Caught Up!</h2>
              <p className="text-slate-500 font-medium">You have completed all scheduled reviews for today. The SM-2 Algorithm is optimizing your retention.</p>
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
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BrainCircuit className="text-indigo-600" size={36} /> Active Recall
          </h1>
          <p className="text-slate-500 font-medium mt-2">SM-2 Spaced Repetition Protocol Active.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl shrink-0">
           <button onClick={() => setLangMode('en')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-white")}>🇬🇧 English</button>
           <button onClick={() => setLangMode('de')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'de' ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-white")}>🇩🇪 Deutsch</button>
        </div>
      </header>

      <div className="mb-8">
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Reviewing {currentIndex + 1} of {deck.length} Due Today</span>
              <span>{Math.round(((currentIndex + 1) / deck.length) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }} />
          </div>
      </div>

      <div className="relative w-full h-[400px] md:h-[450px] perspective-1000 group">
          <div className={cn("w-full h-full transition-all duration-500 transform-style-3d cursor-pointer shadow-2xl rounded-[3rem]", isFlipped ? "rotate-y-180" : "")} onClick={() => !isFlipped && setIsFlipped(true)}>
              
              {/* FRONT OF CARD */}
              <div className={cn("absolute inset-0 backface-hidden bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center", !isFlipped ? "z-20" : "z-0")}>
                 <span className="absolute top-8 text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                     {currentCard.word_type || "Vocabulary"}
                 </span>
                 <div className="text-6xl mb-6">{aiHook ? aiHook.emoji : '🧠'}</div>
                 <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                    {langMode === 'de' && currentCard.gender && <span className={cn("mr-3", getGenderColor(currentCard.gender))}>{currentCard.gender}</span>}
                    {currentCard.word}
                 </h2>
                 <p className="absolute bottom-8 text-slate-400 font-bold animate-pulse flex items-center gap-2"><RefreshCcw size={16} /> Tap to reveal</p>
              </div>

              {/* BACK OF CARD */}
              <div className={cn("absolute inset-0 backface-hidden rotate-y-180 bg-indigo-50 dark:bg-indigo-950/30 rounded-[3rem] border-2 border-indigo-200 dark:border-indigo-900/50 flex flex-col items-center justify-start p-8 text-center overflow-y-auto", isFlipped ? "z-20" : "z-0")}>
                 <h3 className="text-3xl md:text-5xl font-black text-indigo-900 dark:text-indigo-100 mb-6 mt-auto pt-4">
                    {currentCard.translation || currentCard.definition}
                 </h3>

                 {(currentCard.plural_form || currentCard.conjugation) && (
                     <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl w-full max-w-sm text-sm font-medium text-slate-700 dark:text-slate-300 mb-6 border border-indigo-100 dark:border-indigo-800/50">
                         {currentCard.plural_form && <div className="mb-1"><span className="font-bold text-indigo-500 mr-2">Plural:</span> {currentCard.plural_form}</div>}
                         {currentCard.conjugation && <div><span className="font-bold text-indigo-500 mr-2">Conj:</span> {currentCard.conjugation}</div>}
                     </div>
                 )}

                 <div className="w-full max-w-md mt-auto shrink-0 pb-2">
                     {!aiHook ? (
                         <button onClick={(e) => { e.stopPropagation(); generateMemoryHook(); }} disabled={isFetchingHook} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            <Sparkles size={18} className={isFetchingHook ? "animate-spin" : ""} /> {isFetchingHook ? "Forging Mnemonic..." : "Generate Neural Hook"}
                         </button>
                     ) : (
                         <div className="bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-5 rounded-2xl animate-in zoom-in-95">
                             <div className="text-4xl mb-3">{aiHook.emoji}</div>
                             <p className="text-amber-900 dark:text-amber-200 font-bold text-sm leading-relaxed">{aiHook.sentence}</p>
                         </div>
                     )}
                 </div>
              </div>
          </div>
      </div>

      {/* 🎯 NEW: SM-2 RATING CONTROLS */}
      {isFlipped && (
          <div className="flex items-center justify-center gap-4 mt-8 animate-in slide-in-from-bottom-4">
              <button onClick={() => processReview(1)} className="flex-1 max-w-[120px] py-4 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-black tracking-widest uppercase transition-all flex flex-col items-center gap-1 shadow-sm hover:-translate-y-1">
                  <ThumbsDown size={20} /> <span className="text-[10px]">Hard (1D)</span>
              </button>
              <button onClick={() => processReview(4)} className="flex-[2] max-w-[200px] py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 font-black tracking-widest uppercase transition-all shadow-xl hover:-translate-y-1">
                  Good (1W)
              </button>
              <button onClick={() => processReview(5)} className="flex-1 max-w-[120px] py-4 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 font-black tracking-widest uppercase transition-all flex flex-col items-center gap-1 shadow-sm hover:-translate-y-1">
                  <Zap size={20} /> <span className="text-[10px]">Easy</span>
              </button>
          </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  )
}