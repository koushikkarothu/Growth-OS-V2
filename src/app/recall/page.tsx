'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BrainCircuit, Sparkles, RefreshCcw, ThumbsDown, Zap, CheckCircle2, AlertTriangle, ArrowRight, Terminal, Crosshair, Brain, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Vocab {
  id: number; word: string; translation?: string; definition?: string; 
  word_type?: string; gender?: string; plural_form?: string; conjugation?: string;
  interval: number; repetition: number; efactor: number; next_review: string;
}

export default function ActiveRecallPage() {
  const [langMode, setLangMode] = useState<'en' | 'de'>('de')
  const [drillMode, setDrillMode] = useState<'flashcard' | 'forge'>('flashcard')
  const [deck, setDeck] = useState<Vocab[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  const [isFlipped, setIsFlipped] = useState(false)
  const [isFetchingHook, setIsFetchingHook] = useState(false)
  const [aiHook, setAiHook] = useState<{ emoji: string, sentence: string } | null>(null)

  const [forgeInput, setForgeInput] = useState('')
  const [interrogationPrompt, setInterrogationPrompt] = useState('')
  const [gradingState, setGradingState] = useState<'idle' | 'grading' | 'correct' | 'incorrect'>('idle')
  const [aiFeedback, setAiFeedback] = useState('')
  const [comboMultiplier, setComboMultiplier] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { 
      setIsLoading(true); fetchDeck(); resetState();
  }, [langMode, drillMode])

  useEffect(() => {
      if (drillMode === 'forge' && deck.length > 0) generateInterrogation(deck[currentIndex])
      if (drillMode === 'forge' && gradingState === 'idle') inputRef.current?.focus()
  }, [currentIndex, drillMode, deck])

  async function fetchDeck() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    const today = new Date().toISOString()
    const { data } = await supabase.from(tableName).select('*').eq('user_id', user.id).lte('next_review', today).order('next_review', { ascending: true })
    if (data) setDeck(data)
    setIsLoading(false)
  }

  const resetState = () => {
      setIsFlipped(false); setAiHook(null); setIsFetchingHook(false);
      setForgeInput(''); setGradingState('idle'); setAiFeedback('');
  }

  const generateInterrogation = (card: Vocab) => {
      const r = Math.random(); let prompt = '';
      if (langMode === 'en') {
          prompt = `Provide the exact definition or a highly accurate synonym for: "${card.word}"`;
      } else {
          const meaning = card.translation || card.definition;
          if (card.word_type === 'Noun') {
              if (r < 0.33 && card.plural_form) prompt = `What is the plural form of "${card.word}"? (Include the definite article 'die')`;
              else if (r < 0.66) prompt = `What is the gender (der/die/das) of the German word for "${meaning}"?`;
              else prompt = `Translate "${meaning}" to German. You MUST include the correct article (der/die/das) and capitalize the noun.`;
          } else if (card.word_type === 'Verb') {
              const pronouns = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
              const randomPronoun = pronouns[Math.floor(Math.random() * pronouns.length)];
              if (r < 0.6) prompt = `Translate "${meaning}" to German AND conjugate it for the pronoun "${randomPronoun}".`;
              else prompt = `Translate the verb "${meaning}" to German.`;
          } else prompt = `Translate "${meaning}" to German.`;
      }
      setInterrogationPrompt(prompt);
  }

  const submitInterrogation = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!forgeInput.trim() || gradingState === 'grading') return;
      setGradingState('grading')
      const card = deck[currentIndex]

      const customPrompt = `You are a strict German language professor algorithm. 
      Target Database Word: ${JSON.stringify(card)}
      Question Asked to Student: "${interrogationPrompt}"
      Student's Answer: "${forgeInput}"
      Task: Evaluate if the student's answer is correct based on the question asked. 
      Rules: Be strict on German noun capitalization. Ignore minor punctuation. If asked to conjugate a verb, ensure it is accurate.
      Return ONLY a raw JSON object (no markdown). Format: {"correct": boolean, "feedback": "Brief explanation."}`;

      try {
          const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: customPrompt, expectJson: true }) })
          if (!res.ok) throw new Error("API Failed");
          const data = await res.json()
          if (data.result) {
              const parsed = data.result;
              if (parsed.correct) {
                  setGradingState('correct'); setAiFeedback(parsed.feedback || "Execution perfect."); setComboMultiplier(prev => prev + 1);
                  setTimeout(() => processReview(4), 1500);
              } else {
                  setGradingState('incorrect'); setAiFeedback(parsed.feedback || "Incorrect execution."); setComboMultiplier(0); 
              }
          } else throw new Error("No data");
      } catch (err) { setGradingState('incorrect'); setAiFeedback("System error. Neural link failed."); }
  }

  async function processReview(grade: number) {
      const card = deck[currentIndex]
      let interval = card.interval || 0; let repetition = card.repetition || 0; let efactor = card.efactor || 2.5;

      if (grade >= 3) {
          if (repetition === 0) interval = 1;
          else if (repetition === 1) interval = 6;
          else interval = Math.round(interval * efactor);
          repetition += 1;
      } else { repetition = 0; interval = 1; }

      efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
      if (efactor < 1.3) efactor = 1.3;

      const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + interval);
      const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
      await supabase.from(tableName).update({ interval, repetition, efactor, next_review: nextReview.toISOString() }).eq('id', card.id)

      if (currentIndex < deck.length - 1) { setCurrentIndex(prev => prev + 1); resetState(); } 
      else setDeck([])
  }

  async function generateMemoryHook() {
      const currentWord = deck[currentIndex]; if (!currentWord) return;
      setIsFetchingHook(true)
      const customPrompt = `You are a memory expert. Create a mnemonic device for the ${langMode === 'de' ? 'German' : 'English'} word "${currentWord.word}" meaning "${currentWord.translation || currentWord.definition}". Format strictly: EMOJI: [emoji] HOOK: [sentence]`
      try {
        const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: customPrompt, expectJson: false }) })
        const data = await res.json()
        if (data.result) {
            const text = data.result;
            const emojiMatch = text.match(/EMOJI:\s*(.+)/); const hookMatch = text.match(/HOOK:\s*(.+)/);
            setAiHook({ emoji: emojiMatch ? emojiMatch[1] : '🧠', sentence: hookMatch ? hookMatch[1] : text.replace('### 🤖 AI Analysis\n', '') })
        }
      } catch(e) { setAiHook({ emoji: '⚠️', sentence: "Failed to generate hook." }) }
      setIsFetchingHook(false)
  }

  if (isLoading) return <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-500 animate-pulse"><Brain size={40} /><p className="mt-4 font-bold tracking-widest uppercase text-xs">Booting Engine...</p></div>

  if (deck.length === 0) {
      return (
          <div className="max-w-2xl mx-auto py-24 px-4 text-center animate-in fade-in">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200 dark:border-emerald-500/20"><CheckCircle2 size={40} /></div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">All Caught Up!</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">Your neural pathways are optimized for the day.</p>
              <div className="flex justify-center mt-8 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-fit mx-auto border border-slate-200 dark:border-slate-800">
                 <button onClick={() => setLangMode('en')} className={cn("px-5 py-2 rounded-md text-sm font-semibold transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>🇬🇧 English</button>
                 <button onClick={() => setLangMode('de')} className={cn("px-5 py-2 rounded-md text-sm font-semibold transition-all", langMode === 'de' ? "bg-amber-400 text-slate-900 shadow-sm border border-amber-500/50" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>🇩🇪 Deutsch</button>
              </div>
          </div>
      )
  }

  const currentCard = deck[currentIndex]

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-500 relative">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
             <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20"><BrainCircuit className="text-indigo-600 dark:text-indigo-400" size={24} /></div>
             Active Recall
          </h1>
          <p className="text-slate-500 font-bold mt-2 text-xs uppercase tracking-widest">Defeat The Forgetting Curve</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button onClick={() => setLangMode('en')} className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>UK</button>
                <button onClick={() => setLangMode('de')} className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all", langMode === 'de' ? "bg-amber-400 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>DE</button>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button onClick={() => setDrillMode('flashcard')} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5", drillMode === 'flashcard' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><RefreshCcw size={14}/> Passive</button>
                <button onClick={() => setDrillMode('forge')} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5", drillMode === 'forge' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><Terminal size={14}/> Inquisitor</button>
            </div>
        </div>
      </header>

      <div className="mb-8 flex items-end justify-between">
          <div className="flex-1 mr-8">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  <span>Reviewing {currentIndex + 1} of {deck.length} Due</span>
                  <span>{Math.round(((currentIndex + 1) / deck.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }} />
              </div>
          </div>
          
          {drillMode === 'forge' && comboMultiplier > 0 && (
              <div className="flex items-center gap-1.5 text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30 px-2.5 py-1 rounded-md border border-orange-200 dark:border-orange-500/30 animate-in zoom-in-95">
                  <Flame size={14} className="animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">x{comboMultiplier} Combo</span>
              </div>
          )}
      </div>

      {drillMode === 'flashcard' && (
          <div className="animate-in slide-in-from-left-4">
              <div className="relative w-full h-[350px] md:h-[400px] cursor-pointer group" style={{ perspective: '1000px' }} onClick={() => !isFlipped && setIsFlipped(true)}>
                  <div className="w-full h-full relative transition-transform duration-700 shadow-sm rounded-2xl" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                      
                      {/* FRONT */}
                      <div className="absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center hover:border-indigo-300 dark:hover:border-slate-700 transition-colors" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                         <span className="absolute top-6 text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">{currentCard.word_type || "Vocabulary"}</span>
                         <div className="text-5xl mb-4">{aiHook ? aiHook.emoji : '🧠'}</div>
                         <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            {langMode === 'de' && currentCard.gender && <span className={cn("mr-2 opacity-70", currentCard.gender === 'der' ? "text-blue-500" : currentCard.gender === 'die' ? "text-red-500" : currentCard.gender === 'das' ? "text-emerald-500" : "")}>{currentCard.gender}</span>}
                            {currentCard.word}
                         </h2>
                         <p className="absolute bottom-6 text-slate-400 text-xs font-semibold animate-pulse flex items-center gap-1.5"><RefreshCcw size={14} /> Tap to reveal</p>
                      </div>

                      {/* BACK */}
                      <div className="absolute inset-0 bg-indigo-50 dark:bg-slate-800/80 rounded-2xl border border-indigo-200 dark:border-slate-700 flex flex-col items-center justify-start p-8 text-center overflow-y-auto shadow-inner" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                         <h3 className="text-2xl md:text-4xl font-extrabold text-indigo-900 dark:text-white mb-4 mt-auto pt-2">{currentCard.translation || currentCard.definition}</h3>
                         
                         {(currentCard.plural_form || currentCard.conjugation) && (
                             <div className="bg-white dark:bg-slate-900 p-4 rounded-xl w-full max-w-sm text-sm font-medium text-slate-700 dark:text-slate-300 mb-6 border border-indigo-100 dark:border-slate-700 shadow-sm text-left">
                                 {currentCard.plural_form && <div className="mb-1"><span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2 text-[10px] uppercase tracking-widest">Plural</span> {currentCard.plural_form}</div>}
                                 {currentCard.conjugation && <div><span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2 text-[10px] uppercase tracking-widest">Conj</span> {currentCard.conjugation}</div>}
                             </div>
                         )}

                         <div className="w-full max-w-md mt-auto shrink-0 pb-2">
                             {!aiHook ? (
                                 <button onClick={(e) => { e.stopPropagation(); generateMemoryHook(); }} disabled={isFetchingHook} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                    <Sparkles size={16} className={isFetchingHook ? "animate-spin" : ""} /> {isFetchingHook ? "Forging Mnemonic..." : "Generate Neural Hook"}
                                 </button>
                             ) : (
                                 <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-4 rounded-xl animate-in zoom-in-95 text-left flex gap-3 items-start shadow-sm">
                                     <div className="text-2xl">{aiHook.emoji}</div>
                                     <p className="text-amber-900 dark:text-amber-200 font-medium text-sm leading-relaxed flex-1">{aiHook.sentence}</p>
                                 </div>
                             )}
                         </div>
                      </div>

                  </div>
              </div>

              {isFlipped && (
                  <div className="flex items-center justify-center gap-3 mt-6 animate-in slide-in-from-bottom-4">
                      <button onClick={() => processReview(1)} className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold uppercase tracking-widest text-[10px] transition-colors flex flex-col items-center gap-1 shadow-sm">
                          <ThumbsDown size={18} /> Hard (1D)
                      </button>
                      <button onClick={() => processReview(4)} className="flex-[2] py-3 rounded-xl bg-slate-900 dark:bg-white border border-transparent hover:opacity-90 text-white dark:text-slate-900 font-black uppercase tracking-widest text-sm transition-opacity shadow-md">
                          Good (1W)
                      </button>
                      <button onClick={() => processReview(5)} className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest text-[10px] transition-colors flex flex-col items-center gap-1 shadow-sm">
                          <Zap size={18} /> Easy
                      </button>
                  </div>
              )}
          </div>
      )}

      {drillMode === 'forge' && (
          <div className="animate-in slide-in-from-right-4">
             <div className={cn(
                 "w-full bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-6 md:p-10 flex flex-col transition-all duration-300 relative overflow-hidden",
                 gradingState === 'idle' ? "border-slate-200 dark:border-slate-800" : 
                 gradingState === 'grading' ? "border-indigo-400 dark:border-indigo-600 shadow-indigo-500/10" :
                 gradingState === 'correct' ? "border-emerald-400 dark:border-emerald-600 shadow-emerald-500/10" : 
                 "border-red-400 dark:border-red-600 shadow-red-500/10 translate-x-[-5px] md:translate-x-0" 
             )}>
                 
                 <div className="text-center mb-8 relative z-10">
                     <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center gap-1.5 w-fit mx-auto mb-4">
                         <Crosshair size={12}/> Target Aquired
                     </span>
                     <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                         {interrogationPrompt || "Initializing threat vector..."}
                     </h2>
                 </div>

                 <form onSubmit={submitInterrogation} className="w-full max-w-lg mx-auto flex flex-col gap-3 relative z-10">
                     <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Terminal size={18} /></div>
                         <input 
                             ref={inputRef} type="text" placeholder="Type response and hit Enter..." value={forgeInput} onChange={(e) => setForgeInput(e.target.value)} disabled={gradingState === 'grading' || gradingState === 'correct'} autoFocus autoComplete="off" autoCorrect="off" spellCheck="false"
                             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-base font-bold outline-none focus:border-indigo-500 dark:text-white transition-colors disabled:opacity-50"
                         />
                     </div>
                     
                     {gradingState === 'idle' && (
                         <button type="submit" disabled={!forgeInput} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-opacity disabled:opacity-30 mt-2 flex items-center justify-center gap-2 shadow-sm">
                             Execute <ArrowRight size={16} />
                         </button>
                     )}

                     {gradingState === 'grading' && (
                         <button disabled className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs opacity-70 mt-2 flex items-center justify-center gap-2">
                             <RefreshCcw size={16} className="animate-spin" /> Evaluating...
                         </button>
                     )}
                 </form>

                 {gradingState === 'correct' && (
                     <div className="mt-6 text-center animate-in zoom-in-95 relative z-10 bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                         <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2"><CheckCircle2 size={20} /> <span className="font-black uppercase tracking-widest text-sm">Execution Perfect</span></div>
                         <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{aiFeedback}</p>
                     </div>
                 )}

                 {gradingState === 'incorrect' && (
                     <div className="mt-6 text-center bg-red-50 dark:bg-red-900/10 p-5 rounded-xl border border-red-100 dark:border-red-900/30 animate-in slide-in-from-bottom-4 relative z-10">
                         <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-3"><AlertTriangle size={18} /> <span className="font-bold uppercase tracking-widest text-xs">Execution Failed</span></div>
                         <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-5 leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-lg border border-red-100 dark:border-red-900/30 text-left">
                             {aiFeedback}
                         </p>
                         <div className="flex gap-3">
                             <button onClick={() => processReview(1)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors shadow-sm">Accept Failure (Hard)</button>
                             <button onClick={() => {setGradingState('idle'); setForgeInput(''); inputRef.current?.focus()}} className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors shadow-sm">Retry Input</button>
                         </div>
                     </div>
                 )}
             </div>
          </div>
      )}
    </div>
  )
}