'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bot, BookOpen, Target, CheckCircle2, Send, Plus, X, Search, Filter, Wand2, Volume2, Pencil } from 'lucide-react'
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
  const [isAutoFilling, setIsAutoFilling] = useState(false) 

  // Edit State 🎯 NEW
  const [editingWord, setEditingWord] = useState<Vocab | null>(null)

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('All')

  // Drill State
  const [selectedWords, setSelectedWords] = useState<Vocab[]>([])
  const [drillScenario, setDrillScenario] = useState('')
  const [userSentence, setUserSentence] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isDrilling, setIsDrilling] = useState(false)

  useEffect(() => { 
      setVocabList([]); fetchVocab();
      setSelectedWords([]); setDrillScenario(''); setUserSentence(''); setFeedback('');
      setSearchTerm(''); setFilterType('All'); setEditingWord(null);
  }, [langMode])

  async function fetchVocab() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    const { data } = await supabase.from(tableName).select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setVocabList(data)
  }

  // --- ✨ MAGIC AUTO-FILL ENGINE ---
  async function autoFillWord() {
      if (!word.trim()) return alert("Commander, please type a word first to analyze it.")
      setIsAutoFilling(true)

      const customPrompt = langMode === 'de' 
        ? `Analyze the German word "${word}". Return ONLY a raw JSON object with these exact keys: "translation" (English meaning), "word_type" ("Noun", "Verb", "Adjective", "Adverb", "Other"), "gender" ("der", "die", "das", or null if not a noun), "plural" (plural form in German, or null), "conjugation" (brief conjugation notes like 'ich gehe, du gehst' or null). Do not use markdown formatting or code blocks.`
        : `Analyze the English word "${word}". Return ONLY a raw JSON object with this exact key: "translation" (a clear, concise dictionary definition). Do not use markdown formatting or code blocks.`

      try {
          const res = await fetch('/api/analyze-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
          })
          const data = await res.json()
          
          if (data.analysis) {
              const cleanJson = data.analysis.replace(/```json/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanJson);
              
              if(parsed.translation) setTranslation(parsed.translation);
              if(langMode === 'de') {
                 if(parsed.word_type) setWordType(parsed.word_type);
                 if(parsed.gender && parsed.word_type === 'Noun') setGender(parsed.gender);
                 if(parsed.plural) setPlural(parsed.plural);
                 if(parsed.conjugation) setConjugation(parsed.conjugation);
              }
          }
      } catch (e) {
          alert("Auto-fill analysis failed. The AI might be overloaded.")
      }
      setIsAutoFilling(false)
  }

  // --- 🔊 AUDIO PROTOCOL ---
  const playAudio = (text: string) => {
      if (!window.speechSynthesis) return alert("Your browser does not support Web Speech API.")
      window.speechSynthesis.cancel() 
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = langMode === 'de' ? 'de-DE' : 'en-GB'
      utterance.rate = 0.9 
      window.speechSynthesis.speak(utterance)
  }

  // --- VAULT LOGIC (Create, Update, Delete) ---
  async function addWord(e: React.FormEvent) {
    e.preventDefault()
    
    const isDuplicate = vocabList.some(v => v.word.toLowerCase().trim() === word.toLowerCase().trim())
    if (isDuplicate) {
        alert(`Commander, "${word}" is already secured in your vault.`)
        return
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (langMode === 'en') {
        const { error } = await supabase.from('vocabulary').insert([{ user_id: user?.id, word: word, definition: translation }])
        if (error) alert("Could not save to English vault.")
    } else {
        await supabase.from('german_vocabulary').insert([{
            user_id: user?.id, word, translation, word_type: wordType,
            gender: wordType === 'Noun' ? gender : null, plural_form: plural, conjugation
        }])
    }

    setIsAdding(false); setWord(''); setTranslation(''); setPlural(''); setConjugation('');
    fetchVocab()
  }

  // 🎯 NEW: Edit Update Protocol
  async function handleUpdateWord(e: React.FormEvent) {
      e.preventDefault()
      if (!editingWord) return
      
      const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
      const payload = langMode === 'en' 
          ? { word: editingWord.word, definition: editingWord.definition || editingWord.translation }
          : {
              word: editingWord.word,
              translation: editingWord.translation || editingWord.definition,
              word_type: editingWord.word_type,
              gender: editingWord.word_type === 'Noun' ? editingWord.gender : null,
              plural_form: editingWord.plural_form,
              conjugation: editingWord.conjugation
          }

      await supabase.from(tableName).update(payload).eq('id', editingWord.id)
      setEditingWord(null)
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

  const filteredVocab = vocabList.filter(v => {
      const matchesSearch = v.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (v.translation || v.definition || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'All' || v.word_type === filterType;
      return matchesSearch && matchesFilter;
  })

  const getGenderColor = (g?: string) => {
      if (g === 'der') return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
      if (g === 'die') return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
      if (g === 'das') return "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
      return "text-slate-500 bg-slate-100 dark:bg-slate-800"
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt })
      })
      const data = await res.json()
      if (data.analysis) setFeedback(data.analysis.replace('### 🤖 AI Analysis\n', ''))
    } catch(e) { setFeedback("Error connecting to Gemini.") }
  }


  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8 relative">
      
      {/* HEADER & LANGUAGE TOGGLE */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Bot className="text-indigo-600" size={36} /> Language AI Coach
          </h1>
          <p className="text-slate-500 font-medium mt-2">Master vocabulary through active AI execution.</p>
        </div>
        
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
          TAB 1: GLOBAL VAULT
          ============================================================================ */}
      {activeTab === 'vault' && (
        <div className="animate-in slide-in-from-left-4">
          
          <div className="flex flex-col md:flex-row gap-4 mb-8">
              <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 md:w-auto">
                <Plus size={20} /> Add Word
              </button>
              
              <div className="flex-1 relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                    type="text" placeholder="Search vocabulary or translation..." 
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white"
                 />
              </div>

              {langMode === 'de' && (
                 <div className="relative md:w-48">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white appearance-none cursor-pointer">
                        <option value="All">All Types</option>
                        <option value="Noun">Nouns</option>
                        <option value="Verb">Verbs</option>
                        <option value="Adjective">Adjectives</option>
                        <option value="Adverb">Adverbs</option>
                        <option value="Other">Others</option>
                    </select>
                 </div>
              )}
          </div>

          {isAdding && (
            <form onSubmit={addWord} className="bg-indigo-50/50 dark:bg-slate-900 p-6 rounded-3xl border border-indigo-100 dark:border-slate-800 shadow-lg mb-10 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
              
              <div className="md:col-span-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{langMode === 'en' ? 'Word / Phrase' : 'German Word'}</label>
                <div className="relative mt-1">
                    <input type="text" value={word} onChange={e => setWord(e.target.value)} placeholder={langMode === 'en' ? "e.g. Ubiquitous" : "e.g. Fernweh"} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-14 py-3 text-lg font-black outline-none focus:border-indigo-500 dark:text-white shadow-sm" required />
                    
                    <button type="button" onClick={autoFillWord} disabled={isAutoFilling || !word} title="AI Auto-Fill Details" className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/50 dark:text-indigo-400 p-2 rounded-lg transition-all disabled:opacity-50">
                        <Wand2 size={20} className={isAutoFilling ? "animate-spin" : ""} />
                    </button>
                </div>
              </div>

              {langMode === 'de' && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Word Type</label>
                        <select value={wordType} onChange={e => setWordType(e.target.value)} className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white shadow-sm">
                        <option>Noun</option><option>Verb</option><option>Adjective</option><option>Adverb</option><option>Other</option>
                        </select>
                    </div>
                    {wordType === 'Noun' && (
                        <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Article (Gender)</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white shadow-sm">
                            <option value="der">der (Masculine - Blue)</option><option value="die">die (Feminine - Red)</option><option value="das">das (Neutral - Green)</option>
                        </select>
                        </div>
                    )}
                  </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{langMode === 'en' ? 'Definition' : 'English Translation'}</label>
                <input type="text" value={translation} onChange={e => setTranslation(e.target.value)} className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white shadow-sm" required />
              </div>

              {langMode === 'de' && wordType === 'Noun' && (
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plural Form</label>
                    <input type="text" placeholder="e.g. die Autos" value={plural} onChange={e => setPlural(e.target.value)} className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white shadow-sm" />
                 </div>
              )}
              {langMode === 'de' && wordType === 'Verb' && (
                 <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conjugation / Notes</label>
                    <input type="text" placeholder="e.g. ich fahre, du fährst / Perfekt: bin gefahren" value={conjugation} onChange={e => setConjugation(e.target.value)} className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white shadow-sm" />
                 </div>
              )}
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={isAutoFilling} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50">Save to Vault</button>
              </div>
            </form>
          )}

          {/* VOCAB LIST GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
            {filteredVocab.map(v => (
              <div key={v.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
                 
                 {/* 🎯 EDIT AND DELETE BUTTONS */}
                 <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingWord(v)} className="text-slate-300 hover:text-indigo-500 transition-colors p-1" title="Edit Data"><Pencil size={16} /></button>
                    <button onClick={() => deleteWord(v.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Delete"><X size={16} /></button>
                 </div>
                 
                 <div className="flex items-center justify-between mb-2">
                     {langMode === 'de' && (
                         <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded", v.word_type === 'Noun' ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : v.word_type === 'Verb' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400")}>
                           {v.word_type}
                         </span>
                     )}
                     
                     <button onClick={() => playAudio(v.word)} title="Listen to Pronunciation" className="text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ml-auto p-1">
                         <Volume2 size={18} />
                     </button>
                 </div>
                 
                 <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 pr-12">
                    {v.gender && <span className={cn("px-2 py-0.5 rounded text-xs uppercase tracking-wider", getGenderColor(v.gender))}>{v.gender}</span>}
                    {v.word}
                 </h3>
                 <p className="text-slate-500 font-medium text-sm mt-2">{v.translation || v.definition}</p>
                 
                 {(v.plural_form || v.conjugation) && (
                   <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                     {v.plural_form && <div><span className="text-slate-400 font-bold mr-2">Plural:</span>{v.plural_form}</div>}
                     {v.conjugation && <div className={v.plural_form ? "mt-1" : ""}><span className="text-slate-400 font-bold mr-2">Conj:</span>{v.conjugation}</div>}
                   </div>
                 )}
              </div>
            ))}
            {filteredVocab.length === 0 && <p className="text-slate-400 text-sm italic col-span-full text-center py-8">No matching vocabulary found.</p>}
          </div>

          {/* 🎯 THE EDIT MODAL OVERLAY */}
          {editingWord && (
             <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-xl p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative">
                    <button onClick={() => setEditingWord(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20}/></button>
                    
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Pencil size={20} className="text-indigo-500" /> Edit Memory Block
                    </h3>
                    
                    <form onSubmit={handleUpdateWord} className="space-y-4">
                        {langMode === 'de' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Word Type</label>
                                  <select value={editingWord.word_type || 'Noun'} onChange={e => setEditingWord({...editingWord, word_type: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white">
                                      <option>Noun</option><option>Verb</option><option>Adjective</option><option>Adverb</option><option>Other</option>
                                  </select>
                              </div>
                              {editingWord.word_type === 'Noun' && (
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Article (Gender)</label>
                                      <select value={editingWord.gender || 'der'} onChange={e => setEditingWord({...editingWord, gender: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white">
                                          <option value="der">der (M)</option><option value="die">die (F)</option><option value="das">das (N)</option>
                                      </select>
                                  </div>
                              )}
                          </div>
                        )}
                        
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{langMode === 'en' ? 'Word' : 'German Word'}</label>
                            <input type="text" value={editingWord.word} onChange={e => setEditingWord({...editingWord, word: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white" required />
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{langMode === 'en' ? 'Definition' : 'English Translation'}</label>
                            <input type="text" value={editingWord.translation || editingWord.definition || ''} onChange={e => setEditingWord({...editingWord, translation: e.target.value, definition: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white" required />
                        </div>

                        {langMode === 'de' && editingWord.word_type === 'Noun' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plural Form</label>
                                <input type="text" value={editingWord.plural_form || ''} onChange={e => setEditingWord({...editingWord, plural_form: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white" />
                            </div>
                        )}
                        
                        {langMode === 'de' && editingWord.word_type === 'Verb' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conjugation Notes</label>
                                <input type="text" value={editingWord.conjugation || ''} onChange={e => setEditingWord({...editingWord, conjugation: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white" />
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <button type="button" onClick={() => setEditingWord(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all">Update Database</button>
                        </div>
                    </form>
                </div>
             </div>
          )}

        </div>
      )}

      {/* ============================================================================
          TAB 2: DRILL SIMULATOR
          ============================================================================ */}
      {activeTab === 'drill' && (
        <div className="animate-in slide-in-from-right-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-h-[70vh] flex flex-col">
               <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Select Target Words (Max 3)</h3>
               
               <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-2">
                 {vocabList.map(v => {
                    const isSelected = selectedWords.find(sw => sw.id === v.id)
                    return (
                      <button key={v.id} onClick={() => toggleWordSelection(v)} className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border flex flex-col", isSelected ? "bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300")}>
                         <div className="flex items-center gap-2">
                            {v.gender && <span className={cn("text-[10px] px-1.5 rounded uppercase tracking-wider", getGenderColor(v.gender))}>{v.gender}</span>}
                            <span className="text-base">{v.word}</span>
                         </div>
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