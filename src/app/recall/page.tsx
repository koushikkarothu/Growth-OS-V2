'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BrainCircuit, Sparkles, RefreshCcw, ThumbsDown, ThumbsUp, Zap, CheckCircle2, Keyboard, AlertTriangle, ArrowRight, Terminal, Crosshair, Brain, Flame } from 'lucide-react'
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
  
  // Flashcard State
  const [isFlipped, setIsFlipped] = useState(false)
  const [isFetchingHook, setIsFetchingHook] = useState(false)
  const [aiHook, setAiHook] = useState<{ emoji: string, sentence: string } | null>(null)

  // ⚡ THE AI INQUISITOR STATE (Upgraded Forge)
  const [forgeInput, setForgeInput] = useState('')
  const [interrogationPrompt, setInterrogationPrompt] = useState('')
  const [gradingState, setGradingState] = useState<'idle' | 'grading' | 'correct' | 'incorrect'>('idle')
  const [aiFeedback, setAiFeedback] = useState('')
  const [comboMultiplier, setComboMultiplier] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { 
      setIsLoading(true);
      fetchDeck();
      resetState();
  }, [langMode, drillMode])

  // Generate a new dynamic question whenever the card changes in Forge Mode
  useEffect(() => {
      if (drillMode === 'forge' && deck.length > 0) {
          generateInterrogation(deck[currentIndex])
      }
      if (drillMode === 'forge' && gradingState === 'idle') inputRef.current?.focus()
  }, [currentIndex, drillMode, deck])

  async function fetchDeck() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    const today = new Date().toISOString()

    const { data } = await supabase.from(tableName)
        .select('*').eq('user_id', user.id).lte('next_review', today).order('next_review', { ascending: true })
    
    if (data) setDeck(data)
    setIsLoading(false)
  }

  const resetState = () => {
      setIsFlipped(false); setAiHook(null); setIsFetchingHook(false);
      setForgeInput(''); setGradingState('idle'); setAiFeedback('');
  }

  // --- ⚡ DYNAMIC THREAT GENERATION ⚡ ---
  const generateInterrogation = (card: Vocab) => {
      const r = Math.random();
      let prompt = '';
      
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
          } else {
              prompt = `Translate "${meaning}" to German.`;
          }
      }
      setInterrogationPrompt(prompt);
  }

  // --- ⚡ REAL-TIME NEURAL GRADING (GEMINI AI) ⚡ ---
  const submitInterrogation = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!forgeInput.trim() || gradingState === 'grading') return;
      
      setGradingState('grading')
      const card = deck[currentIndex]

      // Instructing Gemini to act as a strict binary evaluator
      const customPrompt = `You are a strict German language professor algorithm. 
      Target Database Word: ${JSON.stringify(card)}
      Question Asked to Student: "${interrogationPrompt}"
      Student's Answer: "${forgeInput}"
      
      Task: Evaluate if the student's answer is correct based on the question asked. 
      Rules: Be strict on German noun capitalization. Ignore minor punctuation. If they were asked to conjugate a verb for a specific pronoun, ensure the conjugation is perfectly accurate even if it isn't explicitly listed in the Database Word notes.
      
      Return ONLY a raw JSON object (no markdown, no backticks). Format:
      {"correct": boolean, "feedback": "Brief, blunt explanation. If wrong, provide the exact correct answer."}`;

      try {
          const res = await fetch('/api/analyze-video', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
          })
          const data = await res.json()
          
          if (data.analysis) {
              const cleanJson = data.analysis.replace(/```json/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanJson);
              
              if (parsed.correct) {
                  setGradingState('correct');
                  setAiFeedback(parsed.feedback || "Execution perfect.");
                  setComboMultiplier(prev => prev + 1);
                  // Auto-advance after 1.5 seconds, registering a 'Good' (4) score
                  setTimeout(() => processReview(4), 1500);
              } else {
                  setGradingState('incorrect');
                  setAiFeedback(parsed.feedback || "Incorrect execution.");
                  setComboMultiplier(0); // Break combo
              }
          }
      } catch (err) {
          setGradingState('incorrect');
          setAiFeedback("System error. Neural link failed to parse response.");
      }
  }

  // SuperMemo-2 Spaced Repetition Algorithm
  async function processReview(grade: number) {
      const card = deck[currentIndex]
      let interval = card.interval || 0;
      let repetition = card.repetition || 0;
      let efactor = card.efactor || 2.5;

      if (grade >= 3) {
          if (repetition === 0) interval = 1;
          else if (repetition === 1) interval = 6;
          else interval = Math.round(interval * efactor);
          repetition += 1;
      } else {
          repetition = 0; interval = 1;
      }

      efactor = efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
      if (efactor < 1.3) efactor = 1.3;

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
      await supabase.from(tableName).update({ interval, repetition, efactor, next_review: nextReview.toISOString() }).eq('id', card.id)

      if (currentIndex < deck.length - 1) {
          setCurrentIndex(prev => prev + 1); resetState();
      } else setDeck([])
  }

  // Classic Flashcard Hook
  async function generateMemoryHook() {
      const currentWord = deck[currentIndex]; if (!currentWord) return;
      setIsFetchingHook(true)
      const customPrompt = `You are a memory expert helping a student memorize vocabulary. Create a mnemonic device for the ${langMode === 'de' ? 'German' : 'English'} word "${currentWord.word}" which means "${currentWord.translation || currentWord.definition}". Rules: 1. Provide exactly ONE highly relevant emoji. 2. Write ONE short, bizarre, and funny English sentence linking the sound of the word to its meaning. Format strictly like this: EMOJI: [emoji] HOOK: [your sentence]`
      try {
        const res = await fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt }) })
        const data = await res.json()
        if (data.analysis) {
            const text = data.analysis;
            const emojiMatch = text.match(/EMOJI:\s*(.+)/); const hookMatch = text.match(/HOOK:\s*(.+)/);
            setAiHook({ emoji: emojiMatch ? emojiMatch[1] : '🧠', sentence: hookMatch ? hookMatch[1] : text.replace('### 🤖 AI Analysis\n', '') })
        }
      } catch(e) { setAiHook({ emoji: '⚠️', sentence: "Failed to generate neural hook." }) }
      setIsFetchingHook(false)
  }

  const getGenderColor = (g?: string) => {
      if (g === 'der') return "text-blue-500"
      if (g === 'die') return "text-red-500"
      if (g === 'das') return "text-emerald-500"
      return "text-slate-400"
  }

  if (isLoading) return <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-500 animate-pulse"><Brain size={50} /><p className="mt-4 font-black tracking-widest uppercase text-xs">Booting Neural Engine...</p></div>

  if (deck.length === 0) {
      return (
          <div className="max-w-4xl mx-auto py-20 px-4 text-center animate-in fade-in">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]"><CheckCircle2 size={48} /></div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">All Caught Up!</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">Your neural pathways are optimized for the day. The SM-2 Algorithm will schedule your next reviews.</p>
              <div className="flex justify-center mt-10 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit mx-auto border border-slate-200 dark:border-slate-800 shadow-sm">
                 <button onClick={() => setLangMode('en')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>🇬🇧 English</button>
                 <button onClick={() => setLangMode('de')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", langMode === 'de' ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>🇩🇪 Deutsch</button>
              </div>
          </div>
      )
  }

  const currentCard = deck[currentIndex]

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      
      {/* HEADER & TOGGLES */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 mt-4 border-b border-slate-200 dark:border-slate-800/50 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-400 flex items-center gap-4 tracking-tight">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20"><BrainCircuit className="text-indigo-600 dark:text-indigo-400" size={32} /></div>
             Active Recall
          </h1>
          <p className="text-slate-500 font-bold mt-3 text-sm tracking-wide">DEFEAT THE FORGETTING CURVE</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setLangMode('en')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>UK</button>
                <button onClick={() => setLangMode('de')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all", langMode === 'de' ? "bg-amber-400 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>DE</button>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setDrillMode('flashcard')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2", drillMode === 'flashcard' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><RefreshCcw size={14}/> Passive</button>
                <button onClick={() => setDrillMode('forge')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2", drillMode === 'forge' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><Terminal size={14}/> Inquisitor</button>
            </div>
        </div>
      </header>

      {/* PROGRESS BAR & COMBO METRIC */}
      <div className="mb-8 flex items-end justify-between">
          <div className="flex-1 mr-8">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  <span>Reviewing {currentIndex + 1} of {deck.length} Due</span>
                  <span>{Math.round(((currentIndex + 1) / deck.length) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }} />
              </div>
          </div>
          
          {drillMode === 'forge' && comboMultiplier > 0 && (
              <div className="flex items-center gap-2 text-orange-500 bg-orange-100 dark:bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-500/30 animate-in zoom-in-95">
                  <Flame size={16} className="animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">x{comboMultiplier} Combo</span>
              </div>
          )}
      </div>

      {/* ============================================================================
          MODE 1: CLASSIC FLASHCARDS
          ============================================================================ */}
      {drillMode === 'flashcard' && (
          <div className="animate-in slide-in-from-left-4">
              <div className="relative w-full h-[400px] md:h-[450px] perspective-1000 group">
                  <div className={cn("w-full h-full transition-all duration-500 transform-style-3d cursor-pointer shadow-2xl rounded-[3rem]", isFlipped ? "rotate-y-180" : "")} onClick={() => !isFlipped && setIsFlipped(true)}>
                      
                      {/* FRONT OF CARD */}
                      <div className={cn("absolute inset-0 backface-hidden bg-white dark:bg-slate-900/80 dark:backdrop-blur-xl rounded-[3rem] border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-8 text-center", !isFlipped ? "z-20" : "z-0")}>
                         <span className="absolute top-8 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10">{currentCard.word_type || "Vocabulary"}</span>
                         <div className="text-6xl mb-6 drop-shadow-xl">{aiHook ? aiHook.emoji : '🧠'}</div>
                         <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                            {langMode === 'de' && currentCard.gender && <span className={cn("mr-3 opacity-80", getGenderColor(currentCard.gender))}>{currentCard.gender}</span>}
                            {currentCard.word}
                         </h2>
                         <p className="absolute bottom-8 text-slate-400 font-bold animate-pulse flex items-center gap-2"><RefreshCcw size={16} /> Tap to flip</p>
                      </div>

                      {/* BACK OF CARD */}
                      <div className={cn("absolute inset-0 backface-hidden rotate-y-180 bg-indigo-50 dark:bg-indigo-900/40 dark:backdrop-blur-xl rounded-[3rem] border-2 border-indigo-200 dark:border-indigo-500/30 flex flex-col items-center justify-start p-8 text-center overflow-y-auto", isFlipped ? "z-20" : "z-0")}>
                         <h3 className="text-3xl md:text-5xl font-black text-indigo-900 dark:text-white mb-6 mt-auto pt-4">{currentCard.translation || currentCard.definition}</h3>
                         {(currentCard.plural_form || currentCard.conjugation) && (
                             <div className="bg-white/60 dark:bg-black/20 p-4 rounded-2xl w-full max-w-sm text-sm font-medium text-slate-700 dark:text-slate-300 mb-6 border border-indigo-100 dark:border-white/5 shadow-inner">
                                 {currentCard.plural_form && <div className="mb-1"><span className="font-black text-indigo-600 dark:text-indigo-400 mr-2 uppercase text-[10px] tracking-widest">Plural</span> {currentCard.plural_form}</div>}
                                 {currentCard.conjugation && <div><span className="font-black text-indigo-600 dark:text-indigo-400 mr-2 uppercase text-[10px] tracking-widest">Conj</span> {currentCard.conjugation}</div>}
                             </div>
                         )}
                         <div className="w-full max-w-md mt-auto shrink-0 pb-2">
                             {!aiHook ? (
                                 <button onClick={(e) => { e.stopPropagation(); generateMemoryHook(); }} disabled={isFetchingHook} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold shadow-xl hover:-translate-y-1 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                    <Sparkles size={18} className={isFetchingHook ? "animate-spin" : ""} /> {isFetchingHook ? "Forging Mnemonic..." : "Generate Neural Hook"}
                                 </button>
                             ) : (
                                 <div className="bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 p-5 rounded-2xl animate-in zoom-in-95 shadow-lg">
                                     <div className="text-4xl mb-3 drop-shadow-md">{aiHook.emoji}</div>
                                     <p className="text-amber-900 dark:text-amber-100 font-bold text-sm leading-relaxed">{aiHook.sentence}</p>
                                 </div>
                             )}
                         </div>
                      </div>
                  </div>
              </div>

              {isFlipped && (
                  <div className="flex items-center justify-center gap-4 mt-8 animate-in slide-in-from-bottom-4">
                      <button onClick={() => processReview(1)} className="flex-1 max-w-[120px] py-4 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/20 font-black tracking-widest uppercase transition-all flex flex-col items-center gap-1 shadow-sm hover:-translate-y-1">
                          <ThumbsDown size={20} /> <span className="text-[10px]">Hard (1D)</span>
                      </button>
                      <button onClick={() => processReview(4)} className="flex-[2] max-w-[200px] py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 font-black tracking-widest uppercase transition-all shadow-xl hover:-translate-y-1 border border-transparent dark:border-white/10">
                          Good (1W)
                      </button>
                      <button onClick={() => processReview(5)} className="flex-1 max-w-[120px] py-4 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:border dark:border-emerald-500/20 font-black tracking-widest uppercase transition-all flex flex-col items-center gap-1 shadow-sm hover:-translate-y-1">
                          <Zap size={20} /> <span className="text-[10px]">Easy</span>
                      </button>
                  </div>
              )}
          </div>
      )}

      {/* ============================================================================
          MODE 2: AI INQUISITOR ENGINE (Dynamic Multi-variate Testing)
          ============================================================================ */}
      {drillMode === 'forge' && (
          <div className="animate-in slide-in-from-right-4">
             <div className={cn(
                 "w-full bg-white dark:bg-slate-900/80 dark:backdrop-blur-xl rounded-[3rem] border-2 shadow-2xl p-8 md:p-12 flex flex-col transition-all duration-500 relative overflow-hidden",
                 gradingState === 'idle' ? "border-slate-200 dark:border-white/10" : 
                 gradingState === 'grading' ? "border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.2)]" :
                 gradingState === 'correct' ? "border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]" : 
                 "border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)] translate-x-[-10px] md:translate-x-0" 
             )}>
                 
                 {gradingState === 'grading' && (
                     <div className="absolute inset-0 bg-indigo-500/5 animate-pulse z-0 pointer-events-none"></div>
                 )}

                 {/* The AI Generated Interrogation Prompt */}
                 <div className="text-center mb-10 relative z-10">
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center gap-2 w-fit mx-auto">
                         <Crosshair size={12}/> Target Aquired
                     </span>
                     <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-6 leading-snug">
                         {interrogationPrompt || "Initializing threat vector..."}
                     </h2>
                 </div>

                 {/* The Command Line Input */}
                 <form onSubmit={submitInterrogation} className="w-full max-w-lg mx-auto flex flex-col gap-4 relative z-10">
                     <div className="relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                             <Terminal size={20} />
                         </div>
                         <input 
                             ref={inputRef} type="text" placeholder="Type response and hit Enter..." value={forgeInput} onChange={(e) => setForgeInput(e.target.value)} disabled={gradingState === 'grading' || gradingState === 'correct'} autoFocus autoComplete="off" autoCorrect="off" spellCheck="false"
                             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-lg font-black outline-none focus:border-indigo-500 dark:text-white transition-all disabled:opacity-50 shadow-inner"
                         />
                     </div>
                     
                     {gradingState === 'idle' && (
                         <button type="submit" disabled={!forgeInput} className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-30 mt-4 flex items-center justify-center gap-2">
                             Execute <ArrowRight size={18} />
                         </button>
                     )}

                     {gradingState === 'grading' && (
                         <button disabled className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl opacity-70 mt-4 flex items-center justify-center gap-2">
                             <RefreshCcw size={18} className="animate-spin" /> Evaluating Neural Link...
                         </button>
                     )}
                 </form>

                 {/* AI Feedback States */}
                 {gradingState === 'correct' && (
                     <div className="mt-8 text-center animate-in zoom-in-95 relative z-10">
                         <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]"><CheckCircle2 size={32} /></div>
                         <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Execution Perfect</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-bold">{aiFeedback}</p>
                     </div>
                 )}

                 {gradingState === 'incorrect' && (
                     <div className="mt-8 text-center bg-red-50 dark:bg-red-950/30 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 animate-in slide-in-from-bottom-4 relative z-10">
                         <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-4"><AlertTriangle size={20} /> <span className="font-black uppercase tracking-widest">Execution Failed</span></div>
                         
                         <p className="text-sm text-slate-700 dark:text-slate-300 font-bold mb-4 leading-relaxed p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-red-100 dark:border-red-900/30">
                             {aiFeedback}
                         </p>
                         
                         <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-900/30 flex gap-3">
                             <button onClick={() => processReview(1)} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-md">Accept Failure (Mark Hard)</button>
                             <button onClick={() => {setGradingState('idle'); setForgeInput(''); inputRef.current?.focus()}} className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all">Retry Input</button>
                         </div>
                     </div>
                 )}
             </div>
          </div>
      )}

    </div>
  )
}