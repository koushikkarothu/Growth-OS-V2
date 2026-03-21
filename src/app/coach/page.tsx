'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bot, BookOpen, Target, CheckCircle2, Send, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Vocab {
  id: number; word: string; translation?: string; definition?: string; 
  word_type?: string; gender?: string; plural_form?: string; conjugation?: string;
}

export default function AICoachPage() {
  const [langMode, setLangMode] = useState<'en' | 'de'>('en')
  const [activeTab, setActiveTab] = useState<'vault' | 'drill'>('vault')
  const [vocabList, setVocabList] = useState<Vocab[]>([])
  
  // Vault Form State
  const [isAdding, setIsAdding] = useState(false)
  const [word, setWord] = useState(''); const [translation, setTranslation] = useState('')
  const [wordType, setWordType] = useState('Noun'); const [gender, setGender] = useState('der')
  const [plural, setPlural] = useState(''); const [conjugation, setConjugation] = useState('')

  // Drill State
  const [selectedWords, setSelectedWords] = useState<Vocab[]>([])
  const [drillScenario, setDrillScenario] = useState('')
  const [userSentence, setUserSentence] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isDrilling, setIsDrilling] = useState(false)

  // Fetch the correct database based on the selected language
  useEffect(() => { 
      // 🐛 BUG FIX: Instantly clear the screen to prevent "Ghost Words"
      setVocabList([]); 
      fetchVocab();
      setSelectedWords([]); setDrillScenario(''); setUserSentence(''); setFeedback('');
  }, [langMode])

  async function fetchVocab() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Check which table to pull from
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    
    const { data, error } = await supabase.from(tableName).select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    
    if (error) {
        console.error("Database Error:", error)
        // If the English table is named something else, it will log here instead of ghosting!
    } else if (data) {
        setVocabList(data)
    }
  }

  // --- GLOBAL VAULT LOGIC ---
  async function addWord(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (langMode === 'en') {
        const { error } = await supabase.from('vocabulary').insert([{ user_id: user?.id, word: word, definition: translation }])
        if (error) alert("Could not save to English vault. Check if your table is named 'vocabulary' and uses 'definition'.")
    } else {
        await supabase.from('german_vocabulary').insert([{
            user_id: user?.id, word, translation, word_type: wordType,
            gender: wordType === 'Noun' ? gender : null, plural_form: plural, conjugation
        }])
    }

    setIsAdding(false); setWord(''); setTranslation(''); setPlural(''); setConjugation('');
    fetchVocab()
  }

  async function deleteWord(id: number) {
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    await supabase.from(tableName).delete().eq('id', id)
    fetchVocab()
  }

  const toggleWordSelection = (v: Vocab) => {
    if (selectedWords.find(sw => sw.id === v.id)) setSelectedWords(selectedWords.filter(sw => sw.id !== v.id))
    else if (selectedWords.length < 3) setSelectedWords([...selectedWords, v])
  }

  // --- GEMINI AI DRILL PROTOCOL ---
  async function generateChallenge() {
    if (selectedWords.length === 0) return alert("Select at least 1 word for the drill.")
    setIsDrilling(true); setFeedback(''); setUserSentence('');
    setDrillScenario("🤖 Gemini is formulating your challenge..."); 

    const wordList = langMode === 'en' 
        ? selectedWords.map(w => `${w.word}`).join(', ')
        : selectedWords.map(w => `${w.gender ? w.gender + ' ' : ''}${w.word} (${w.translation})`).join(', ')
    
    const customPrompt = langMode === 'en'
        ? `You are an expert English IELTS Tutor. The student is learning these words: ${wordList}. Create a challenge: Tell the student to write ONE complex, academic sentence that uses all of these words correctly. Just give the instruction, nothing else.`
        : `You are a strict German Professor testing a B1 student. The student is learning these words: ${wordList}. Create a challenge: Tell the student in English to write ONE German sentence that uses all of these words logically. Just give the English instruction, nothing else.`

    try {
      const res = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
      })
      const data = await res.json()
      if (data.analysis) setDrillScenario(data.analysis.replace('### 🤖 AI Analysis\n', ''))
    } catch(e) { setDrillScenario("Error generating challenge.") }
  }

  async function gradeSentence() {
    if (!userSentence) return
    setFeedback("🤖 Grading your execution...");

    const wordList = selectedWords.map(w => w.word).join(', ')
    
    const customPrompt = langMode === 'en'
        ? `You are an expert IELTS English Tutor. The student was asked to write a sentence using the words: ${wordList}. The student wrote: "${userSentence}". Grade it. 1. Is it grammatically correct and naturally phrased? 2. If wrong, explain why. 3. Provide a perfect band 9 example sentence. Keep it brief.`
        : `You are a strict German Professor. The student was asked to write a sentence using the words: ${wordList}. The student wrote: "${userSentence}". Grade it. 1. Is it grammatically correct (check gender, case, verb position)? 2. If wrong, explain EXACTLY why. 3. Provide the perfect German translation. Keep it brief.`

    try {
      const res = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
      })
      const data = await res.json()
      if (data.analysis) setFeedback(data.analysis.replace('### 🤖 AI Analysis\n', ''))
    } catch(e) { setFeedback("Error connecting to Gemini.") }
  }


  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      
      {/* HEADER & LANGUAGE TOGGLE */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Bot className="text-indigo-600" size={36} /> Language AI Coach
          </h1>
          <p className="text-slate-500 font-medium mt-2">Master vocabulary through active AI execution.</p>
        </div>
        
        {/* Universal Engine Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
           <button onClick={() => setLangMode('en')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all", langMode === 'en' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
             🇬🇧 English
           </button>
           <button onClick={() => setLangMode('de')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all", langMode === 'de' ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
             🇩🇪 Deutsch
           </button>
        </div>
      </header>

      {/* SUB-NAV TABS */}
      <div className="flex gap-4 mb-8">
         <button onClick={() => setActiveTab('vault')} className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'vault' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400")}>
            <BookOpen size={16} className="inline mr-2" /> Global Vault
         </button>
         <button onClick={() => setActiveTab('drill')} className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'drill' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400")}>
            <Target size={16} className="inline mr-2" /> Active Drill
         </button>
      </div>

      {/* ============================================================================
          TAB 1: GLOBAL VAULT (Restored!)
          ============================================================================ */}
      {activeTab === 'vault' && (
        <div className="animate-in slide-in-from-left-4">
          <button onClick={() => setIsAdding(!isAdding)} className="mb-8 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2">
            <Plus size={20} /> Add New {langMode === 'en' ? 'Word' : 'German Word'}
          </button>

          {isAdding && (
            <form onSubmit={addWord} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* German-Only Fields */}
              {langMode === 'de' && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Word Type</label>
                        <select value={wordType} onChange={e => setWordType(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white">
                        <option>Noun</option><option>Verb</option><option>Adjective/Other</option>
                        </select>
                    </div>
                    {wordType === 'Noun' && (
                        <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Article (Gender)</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white">
                            <option value="der">der (Masculine)</option><option value="die">die (Feminine)</option><option value="das">das (Neutral)</option>
                        </select>
                        </div>
                    )}
                  </div>
              )}

              {/* Universal Fields */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{langMode === 'en' ? 'Word / Phrase' : 'German Word'}</label>
                <input type="text" value={word} onChange={e => setWord(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white" required />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{langMode === 'en' ? 'Definition' : 'English Translation'}</label>
                <input type="text" value={translation} onChange={e => setTranslation(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white" required />
              </div>

              {/* German Extra Fields */}
              {langMode === 'de' && wordType === 'Noun' && (
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plural Form</label>
                    <input type="text" placeholder="e.g. die Häuser" value={plural} onChange={e => setPlural(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white" />
                 </div>
              )}

              {langMode === 'de' && wordType === 'Verb' && (
                 <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conjugation / Notes</label>
                    <input type="text" placeholder="e.g. ich gehe, du gehst / Perfekt: bin gegangen" value={conjugation} onChange={e => setConjugation(e.target.value)} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white" />
                 </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold shadow-lg">Save to Vault</button>
              </div>
            </form>
          )}

          {/* VOCAB LIST GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vocabList.map(v => (
              <div key={v.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                 <button onClick={() => deleteWord(v.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                 
                 {langMode === 'de' && (
                     <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded", v.word_type === 'Noun' ? "bg-blue-100 text-blue-600" : v.word_type === 'Verb' ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600")}>
                          {v.word_type}
                        </span>
                     </div>
                 )}
                 
                 <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {v.gender && <span className="text-slate-400 font-medium text-lg">{v.gender}</span>}
                    {v.word}
                 </h3>
                 <p className="text-slate-500 font-medium text-sm mt-1">{v.translation || v.definition}</p>
                 
                 {(v.plural_form || v.conjugation) && (
                   <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
                     {v.plural_form && <div><span className="text-slate-400 font-bold mr-2">Plural:</span>{v.plural_form}</div>}
                     {v.conjugation && <div><span className="text-slate-400 font-bold mr-2">Conj:</span>{v.conjugation}</div>}
                   </div>
                 )}
              </div>
            ))}
            {vocabList.length === 0 && <p className="text-slate-400 text-sm italic col-span-full">No words found in this vault.</p>}
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 2: DRILL SIMULATOR
          ============================================================================ */}
      {activeTab === 'drill' && (
        <div className="animate-in slide-in-from-right-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: Selection Panel */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-h-[70vh] flex flex-col">
               <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Select Target Words (Max 3)</h3>
               
               <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-2">
                 {vocabList.map(v => {
                    const isSelected = selectedWords.find(sw => sw.id === v.id)
                    return (
                      <button key={v.id} onClick={() => toggleWordSelection(v)} className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border flex flex-col", isSelected ? "bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300")}>
                         <span className="text-base">{v.gender ? v.gender + ' ' : ''}{v.word}</span>
                         <span className={cn("text-xs font-medium mt-1", isSelected ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400")}>{v.translation || v.definition}</span>
                      </button>
                    )
                 })}
                 {vocabList.length === 0 && <p className="text-slate-400 text-sm italic">Vault is empty.</p>}
               </div>

               <button onClick={generateChallenge} disabled={selectedWords.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  <Target size={18} /> Generate Challenge
               </button>
            </div>

            {/* RIGHT: Active Drill Panel */}
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 md:p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center"><Bot size={20}/></div>
                    <span className="font-black text-indigo-900 dark:text-indigo-300 tracking-wider uppercase text-sm">Professor Gemini</span>
                 </div>
                 <p className="text-lg font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                   {drillScenario || "Select your target vocabulary from the left and initiate the drill."}
                 </p>
               </div>

               {isDrilling && drillScenario && (
                 <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Construct Your Sentence</label>
                    <textarea 
                      value={userSentence} 
                      onChange={e => setUserSentence(e.target.value)}
                      placeholder={langMode === 'en' ? "Type your English sentence here..." : "Type your German sentence here..."}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-medium outline-none focus:border-indigo-500 dark:text-white resize-none h-32 mb-4"
                    />
                    <button onClick={gradeSentence} disabled={!userSentence} className="w-full md:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                       <Send size={18} /> Submit for Grading
                    </button>
                 </div>
               )}

               {feedback && (
                 <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] animate-in zoom-in-95">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                       <CheckCircle2 className="text-emerald-500" /> Evaluation Report
                    </h3>
                    <div className="prose dark:prose-invert max-w-none text-sm font-medium leading-relaxed">
                       {feedback.split('\n').map((line, i) => (
                         <p key={i} className="mb-2">{line.replace(/\*\*/g, '')}</p>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}