'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Bot, BookOpen, Target, CheckCircle2, Send, Plus, X, Search, Filter, Wand2, Volume2, Pencil, Trash2, Library, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Vocab { id: number; word: string; translation?: string; definition?: string; word_type?: string; gender?: string; plural_form?: string; conjugation?: string; verb_type?: string; praeteritum?: string; perfekt?: string; }

export default function AICoachPage() {
  const [langMode, setLangMode] = useState<'en' | 'de'>('de')
  const [activeTab, setActiveTab] = useState<'vault' | 'drill'>('vault')
  const [vocabList, setVocabList] = useState<Vocab[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  
  const [isAdding, setIsAdding] = useState(false)
  const [word, setWord] = useState(''); const [translation, setTranslation] = useState('')
  const [wordType, setWordType] = useState('Noun'); const [gender, setGender] = useState('der')
  const [plural, setPlural] = useState(''); const [conjugation, setConjugation] = useState('')
  const [verbType, setVerbType] = useState('Regular'); const [praeteritum, setPraeteritum] = useState(''); const [perfekt, setPerfekt] = useState('')
  const [isAutoFilling, setIsAutoFilling] = useState(false) 

  const [editingWord, setEditingWord] = useState<Vocab | null>(null)
  const [searchTerm, setSearchTerm] = useState(''); const [filterType, setFilterType] = useState('All')

  const [selectedWords, setSelectedWords] = useState<Vocab[]>([])
  const [drillScenario, setDrillScenario] = useState('')
  const [userSentence, setUserSentence] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isDrilling, setIsDrilling] = useState(false)

  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false)
  const [globalNotes, setGlobalNotes] = useState<{title: string, notes: string}[]>([])
  const [noteSearch, setNoteSearch] = useState('')

  // Legacy Sync State
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{current: number, total: number} | null>(null)

  useEffect(() => { 
      setVocabList([]); fetchVocab();
      setSelectedWords([]); setDrillScenario(''); setUserSentence(''); setFeedback('');
      setSearchTerm(''); setFilterType('All'); setEditingWord(null); setExpandedId(null);
  }, [langMode])

  const fetchGlobalNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('learning_videos').select('title, notes').eq('user_id', user.id).not('notes', 'is', null).neq('notes', '')
      if (data) setGlobalNotes(data)
  }

  async function fetchVocab() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    const { data } = await supabase.from(tableName).select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setVocabList(data)
  }

  // 🎯 THE FIX: Legacy Sync Engine. Finds incomplete verbs and auto-fills them via the AI API.
  async function syncMissingVerbData() {
      if (!confirm("Initiate Legacy Sync? This will command the AI to analyze your old verbs and backfill missing Praeteritum, Perfekt, and Conjugation data. This may take a moment.")) return;
      
      setIsSyncing(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: missingVerbs } = await supabase.from('german_vocabulary')
          .select('*')
          .eq('user_id', user?.id)
          .eq('word_type', 'Verb')
          .or('verb_type.is.null,praeteritum.is.null,perfekt.is.null,conjugation.is.null')
          
      if (!missingVerbs || missingVerbs.length === 0) {
          alert("All verbs in the vault are already fully synchronized!")
          setIsSyncing(false); return;
      }

      setSyncProgress({ current: 0, total: missingVerbs.length })

      for (let i = 0; i < missingVerbs.length; i++) {
          const v = missingVerbs[i]
          try {
              const customPrompt = `Analyze German verb "${v.word}". Return ONLY JSON: {"verb_type":"Regular/Irregular/Separable Regular/Separable Irregular/Modal", "praeteritum":"Simple past (ich/er form)", "perfekt":"Perfect tense (e.g. hat gemacht)", "conjugation":"Present tense (ich, du, er/sie/es, wir, ihr, sie/Sie)"}`
              const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: customPrompt, expectJson: true }) })
              const data = await res.json()
              
              if (data.result) {
                  await supabase.from('german_vocabulary').update({
                      verb_type: data.result.verb_type || v.verb_type || 'Regular',
                      praeteritum: data.result.praeteritum || v.praeteritum,
                      perfekt: data.result.perfekt || v.perfekt,
                      conjugation: data.result.conjugation || v.conjugation
                  }).eq('id', v.id)
              }
          } catch (e) { console.error("Failed to sync word:", v.word) }
          
          setSyncProgress({ current: i + 1, total: missingVerbs.length })
          await new Promise(resolve => setTimeout(resolve, 1500)) // Throttle to prevent rate limiting
      }
      
      setSyncProgress(null); setIsSyncing(false); fetchVocab();
      alert("Legacy Synchronization Complete. All structural data updated.");
  }

  async function autoFillWord() {
      const targetWord = word; 
      if (!targetWord.trim()) return alert("Type a word first to extract its data.")
      
      setIsAutoFilling(true)
      // 🎯 THE FIX: Prompt now explicitly demands full conjugations
      const customPrompt = langMode === 'de' 
        ? `Analyze German input "${targetWord}". Return ONLY JSON: {"translation":"English meaning", "word_type":"Noun/Verb/Adjective/Adverb/Preposition/Phrase/Grammar", "gender":"der/die/das or null", "plural":"plural form or null", "verb_type":"Regular/Irregular/Separable Regular/Separable Irregular/Modal or null", "praeteritum":"Simple past (ich/er form) or null", "perfekt":"Perfect tense (e.g. hat gemacht) or null", "conjugation":"Present tense (ich, du, er/sie/es, wir, ihr, sie/Sie) or null"}`
        : `Analyze the English word "${targetWord}". Return ONLY a raw JSON object with this key: "translation" (definition).`

      try {
          const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: customPrompt, expectJson: true }) })
          if (!res.ok) throw new Error("API Failed");
          const data = await res.json()
          
          if (data.result) {
              if (langMode === 'en') setTranslation(data.result.translation || data.result);
              else {
                 const parsed = data.result; 
                 if(parsed.translation) setTranslation(parsed.translation);
                 if(parsed.word_type) setWordType(parsed.word_type);
                 if(parsed.gender && parsed.word_type === 'Noun') setGender(parsed.gender);
                 if(parsed.plural) setPlural(parsed.plural);
                 if(parsed.verb_type) setVerbType(parsed.verb_type);
                 if(parsed.praeteritum) setPraeteritum(parsed.praeteritum);
                 if(parsed.perfekt) setPerfekt(parsed.perfekt);
                 if(parsed.conjugation) setConjugation(parsed.conjugation);
              }
          }
      } catch (e) { alert("Auto-fill analysis failed. Neural link disrupted.") }
      setIsAutoFilling(false)
  }

  const playAudio = (text: string) => {
      if (!text) return;
      if (!window.speechSynthesis) return alert("Your browser does not support Web Speech API.")
      window.speechSynthesis.cancel() 
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = langMode === 'de' ? 'de-DE' : 'en-GB'
      utterance.rate = 0.85 
      window.speechSynthesis.speak(utterance)
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault()
    const isDuplicate = vocabList.some(v => v.word.toLowerCase().trim() === word.toLowerCase().trim())
    if (isDuplicate) { alert(`Commander, "${word}" is already secured in your vault.`); return; }
    const { data: { user } } = await supabase.auth.getUser()
    if (langMode === 'en') {
        await supabase.from('vocabulary').insert([{ user_id: user?.id, word: word, definition: translation }])
    } else {
        await supabase.from('german_vocabulary').insert([{ 
            user_id: user?.id, word, translation, word_type: wordType, 
            gender: wordType === 'Noun' ? gender : null, 
            plural_form: wordType === 'Noun' ? plural : null, 
            verb_type: wordType === 'Verb' ? verbType : null,
            praeteritum: wordType === 'Verb' ? praeteritum : null,
            perfekt: wordType === 'Verb' ? perfekt : null,
            conjugation: wordType === 'Verb' ? conjugation : null 
        }])
    }
    setIsAdding(false); setWord(''); setTranslation(''); setPlural(''); setConjugation(''); setPraeteritum(''); setPerfekt(''); fetchVocab()
  }

  async function handleUpdateWord(e: React.FormEvent) {
      e.preventDefault(); if (!editingWord) return;
      const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
      const payload = langMode === 'en' 
          ? { word: editingWord.word, definition: editingWord.definition || editingWord.translation }
          : { 
              word: editingWord.word, translation: editingWord.translation || editingWord.definition, word_type: editingWord.word_type, 
              gender: editingWord.word_type === 'Noun' ? editingWord.gender : null, 
              plural_form: editingWord.plural_form, conjugation: editingWord.conjugation,
              verb_type: editingWord.word_type === 'Verb' ? editingWord.verb_type : null,
              praeteritum: editingWord.praeteritum, perfekt: editingWord.perfekt
            }
      await supabase.from(tableName).update(payload).eq('id', editingWord.id)
      setEditingWord(null); fetchVocab()
  }

  async function deleteWord(id: number) {
    if (!confirm("Delete this memory block? This action cannot be undone.")) return;
    const tableName = langMode === 'en' ? 'vocabulary' : 'german_vocabulary'
    await supabase.from(tableName).delete().eq('id', id)
    fetchVocab()
  }

  const toggleWordSelection = (v: Vocab) => {
    if (selectedWords.find(sw => sw.id === v.id)) setSelectedWords(selectedWords.filter(sw => sw.id !== v.id))
    else if (selectedWords.length < 3) setSelectedWords([...selectedWords, v])
  }

  // 🎯 THE FIX: Expanded robust filter engine for complex verb types
  const filteredVocab = vocabList.filter(v => {
      const matchesSearch = v.word.toLowerCase().includes(searchTerm.toLowerCase()) || (v.translation || v.definition || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (filterType !== 'All') {
          if (filterType === 'Verb (All)') matchesFilter = v.word_type === 'Verb';
          else if (filterType.includes('Verb - ')) {
              const specificType = filterType.replace('Verb - ', '');
              matchesFilter = v.word_type === 'Verb' && v.verb_type === specificType;
          }
          else matchesFilter = v.word_type === filterType;
      }
      return matchesSearch && matchesFilter;
  })

  const getGenderColor = (g?: string) => {
      if (g === 'der') return "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
      if (g === 'die') return "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400"
      if (g === 'das') return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
      return "text-slate-500 bg-slate-100 dark:bg-slate-800"
  }

  async function generateChallenge() {
    if (selectedWords.length === 0) return alert("Select at least 1 word for the drill.")
    setIsDrilling(true); setFeedback(''); setUserSentence(''); setDrillScenario("🤖 Gemini is formulating your challenge..."); 
    const wordList = langMode === 'en' ? selectedWords.map(w => `${w.word}`).join(', ') : selectedWords.map(w => `${w.gender ? w.gender + ' ' : ''}${w.word} (${w.translation})`).join(', ')
    const customPrompt = langMode === 'en'
        ? `You are an expert English IELTS Tutor. The student is learning these words: ${wordList}. Create a challenge: Tell the student to write ONE complex, academic sentence that uses all of these words correctly. Just give the instruction, nothing else.`
        : `You are a strict German Professor testing a B1 student. The student is learning these words: ${wordList}. Create a challenge: Tell the student in English to write ONE German sentence that uses all of these words logically. Just give the English instruction, nothing else.`
    try {
      const res = await fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt }) })
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
      const res = await fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt }) })
      const data = await res.json()
      if (data.analysis) setFeedback(data.analysis.replace('### 🤖 AI Analysis\n', ''))
    } catch(e) { setFeedback("Error connecting to Gemini.") }
  }

  return (
    <div className="w-full pb-32 animate-in fade-in duration-500 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Bot className="text-indigo-600 dark:text-indigo-400" size={32} /> Language AI Coach
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-sm">Master vocabulary through active AI execution.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           {langMode === 'de' && (
               <button onClick={syncMissingVerbData} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 font-bold rounded-lg shadow-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm disabled:opacity-50">
                   <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
                   {isSyncing ? `Syncing (${syncProgress?.current}/${syncProgress?.total})` : `Sync Legacy Verbs`}
               </button>
           )}
           <button onClick={() => {fetchGlobalNotes(); setIsNotesDrawerOpen(true);}} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"><Library size={16} /> Notes Library</button>
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
               <button onClick={() => setLangMode('en')} className={cn("px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors", langMode === 'en' ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}>UK</button>
               <button onClick={() => setLangMode('de')} className={cn("px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors", langMode === 'de' ? "bg-amber-400 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}>DE</button>
           </div>
        </div>
      </header>

      <div className="flex gap-3 mb-8">
         <button onClick={() => setActiveTab('vault')} className={cn("px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border", activeTab === 'vault' ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 shadow-sm" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}><BookOpen size={16} className="inline mr-2" /> Global Vault</button>
         <button onClick={() => setActiveTab('drill')} className={cn("px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border", activeTab === 'drill' ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 shadow-sm" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}><Target size={16} className="inline mr-2" /> Active Drill</button>
      </div>

      {activeTab === 'vault' && (
        <div className="animate-in slide-in-from-left-4">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
              <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2 md:w-auto text-sm"><Plus size={18} /> Add Word</button>
              <div className="flex-1 relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input type="text" placeholder="Search vocabulary or translation..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white shadow-sm" />
              </div>
              {langMode === 'de' && (
                 <div className="relative md:w-56">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white appearance-none cursor-pointer shadow-sm">
                        <option value="All">All Categories</option>
                        <option value="Noun">Nouns</option>
                        <option value="Verb (All)">Verbs (All)</option>
                        <option value="Verb - Regular">↳ Regular Verbs</option>
                        <option value="Verb - Irregular">↳ Irregular Verbs</option>
                        <option value="Verb - Separable Regular">↳ Separable Regular</option>
                        <option value="Verb - Separable Irregular">↳ Separable Irregular</option>
                        <option value="Verb - Modal">↳ Modal Verbs</option>
                        <option value="Adjective">Adjectives</option>
                        <option value="Adverb">Adverbs</option>
                        <option value="Preposition">Prepositions</option>
                        <option value="Phrase">Phrases</option>
                        <option value="Grammar">Grammar</option>
                    </select>
                 </div>
              )}
          </div>

          {isAdding && (
            <form onSubmit={addWord} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-10 grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-top-4">
              <div className="md:col-span-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">{langMode === 'en' ? 'Word / Phrase' : 'German Term'}</label>
                <div className="relative">
                    <input type="text" value={word} onChange={e => setWord(e.target.value)} placeholder={langMode === 'en' ? "e.g. Ubiquitous" : "e.g. Fernweh"} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-4 pr-12 py-3 text-base font-bold outline-none focus:border-indigo-500 dark:text-white shadow-sm" required />
                    <button type="button" onClick={autoFillWord} disabled={isAutoFilling || !word} title="AI Auto-Fill Details" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-1.5 rounded-md transition-colors disabled:opacity-50"><Wand2 size={18} className={isAutoFilling ? "animate-spin" : ""} /></button>
                </div>
              </div>
              {langMode === 'de' && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 dark:border-slate-800 pt-5 mt-1">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Category</label>
                        <select value={wordType} onChange={e => setWordType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-semibold outline-none dark:text-white"><option value="Noun">Noun</option><option value="Verb">Verb</option><option value="Adjective">Adjective</option><option value="Adverb">Adverb</option><option value="Preposition">Preposition</option><option value="Phrase">Phrase / Idiom</option><option value="Grammar">Grammar Rule</option><option value="Other">Other</option></select>
                    </div>
                    {wordType === 'Noun' && (<div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Article (Gender)</label><select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-semibold outline-none dark:text-white"><option value="der">der (M)</option><option value="die">die (F)</option><option value="das">das (N)</option></select></div>)}
                    {wordType === 'Verb' && (<div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Verb Type</label><select value={verbType} onChange={e => setVerbType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-semibold outline-none dark:text-white"><option value="Regular">Regular (Schwach)</option><option value="Irregular">Irregular (Stark)</option><option value="Separable Regular">Separable Regular</option><option value="Separable Irregular">Separable Irregular</option><option value="Modal">Modal</option></select></div>)}
                  </div>
              )}
              <div className={cn(langMode === 'de' && wordType === 'Verb' ? "md:col-span-2" : "")}><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">{langMode === 'en' ? 'Definition' : 'English Translation / Meaning'}</label><input type="text" value={translation} onChange={e => setTranslation(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-semibold outline-none dark:text-white shadow-sm" required /></div>
              {langMode === 'de' && wordType === 'Noun' && (<div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Plural Form</label><input type="text" placeholder="e.g. die Häuser" value={plural} onChange={e => setPlural(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-medium outline-none dark:text-white shadow-sm" /></div>)}
              {langMode === 'de' && wordType === 'Verb' && (
                  <>
                      <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Present Conjugations</label><input type="text" placeholder="ich, du, er/sie/es, wir, ihr, sie" value={conjugation} onChange={e => setConjugation(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-medium outline-none dark:text-white shadow-sm" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Präteritum</label><input type="text" placeholder="e.g. machte" value={praeteritum} onChange={e => setPraeteritum(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-medium outline-none dark:text-white shadow-sm" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Perfekt</label><input type="text" placeholder="e.g. hat gemacht" value={perfekt} onChange={e => setPerfekt(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-medium outline-none dark:text-white shadow-sm" /></div>
                  </>
              )}
              <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-5">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm">Cancel</button>
                  <button type="submit" disabled={isAutoFilling} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50 text-sm">Save to Vault</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative">
            {filteredVocab.map(v => (
              <div key={v.id} onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:shadow-md hover:border-indigo-300 dark:hover:border-slate-700 transition-all flex flex-col cursor-pointer">
                 <div className="flex items-start justify-between mb-4">
                     {langMode === 'de' ? (<span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded", v.word_type === 'Noun' ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : v.word_type === 'Verb' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : v.word_type === 'Phrase' || v.word_type === 'Grammar' ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400")}>{v.word_type}</span>) : <div />}
                     <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => {e.stopPropagation(); setEditingWord(v)}} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-all p-1.5 rounded-md" title="Edit Data"><Pencil size={14} /></button>
                        <button onClick={(e) => {e.stopPropagation(); deleteWord(v.id)}} className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-all p-1.5 rounded-md" title="Delete"><Trash2 size={14} /></button>
                     </div>
                 </div>
                 <div className="flex items-start justify-between gap-3">
                     <div className="min-w-0 pr-2">
                         <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap mb-1 truncate">
                            {v.gender && <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold", getGenderColor(v.gender))}>{v.gender}</span>}
                            {v.word}
                         </h3>
                         <p className={cn("text-slate-500 dark:text-slate-400 font-medium text-sm leading-snug transition-all", expandedId === v.id ? "whitespace-pre-wrap mt-2" : "line-clamp-2")}>{v.translation || v.definition}</p>
                     </div>
                     <button onClick={(e) => {e.stopPropagation(); playAudio(v.word)}} title="Listen to Pronunciation" className="shrink-0 w-10 h-10 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700"><Volume2 size={16} className="ml-0.5" /></button>
                 </div>
                 
                 {expandedId === v.id && (v.plural_form || v.verb_type || v.conjugation || v.praeteritum || v.perfekt) && (
                     <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 text-xs font-medium text-slate-600 dark:text-slate-400 animate-in fade-in slide-in-from-top-2">
                         {v.plural_form && <div><span className="text-slate-400 font-bold block uppercase tracking-widest text-[9px] mb-0.5">Plural</span>{v.plural_form}</div>}
                         {v.verb_type && <div><span className="text-slate-400 font-bold block uppercase tracking-widest text-[9px] mb-0.5">Verb Type</span><span className="text-indigo-500 font-bold">{v.verb_type}</span></div>}
                         {v.conjugation && <div>
                             <div className="flex items-center gap-2 mb-0.5">
                                 <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Present</span>
                                 <button onClick={(e) => {e.stopPropagation(); playAudio(v.conjugation!)}} className="text-slate-400 hover:text-indigo-500"><Volume2 size={10}/></button>
                             </div>
                             <span className="whitespace-pre-wrap">{v.conjugation}</span>
                         </div>}
                         {v.praeteritum && <div>
                             <div className="flex items-center gap-2 mb-0.5">
                                 <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Präteritum</span>
                                 <button onClick={(e) => {e.stopPropagation(); playAudio(v.praeteritum!)}} className="text-slate-400 hover:text-indigo-500"><Volume2 size={10}/></button>
                             </div>
                             <span>{v.praeteritum}</span>
                         </div>}
                         {v.perfekt && <div>
                             <div className="flex items-center gap-2 mb-0.5">
                                 <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Perfekt (Partizip II)</span>
                                 <button onClick={(e) => {e.stopPropagation(); playAudio(v.perfekt!)}} className="text-slate-400 hover:text-indigo-500"><Volume2 size={10}/></button>
                             </div>
                             <span>{v.perfekt}</span>
                         </div>}
                     </div>
                 )}
                 <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-indigo-500">
                     {expandedId === v.id ? "Collapse" : "Expand"} {expandedId === v.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </div>
              </div>
            ))}
          </div>

          {/* EDIT WORD MODAL */}
          {editingWord && (
             <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-xl p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <button onClick={() => setEditingWord(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><X size={18}/></button>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Pencil size={18} className="text-indigo-500" /> Edit Memory Block</h3>
                    <form onSubmit={handleUpdateWord} className="space-y-4">
                        {langMode === 'de' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Category</label><select value={editingWord.word_type || 'Noun'} onChange={e => setEditingWord({...editingWord, word_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none dark:text-white"><option value="Noun">Noun</option><option value="Verb">Verb</option><option value="Adjective">Adjective</option><option value="Adverb">Adverb</option><option value="Preposition">Preposition</option><option value="Phrase">Phrase / Idiom</option><option value="Grammar">Grammar Rule</option><option value="Other">Other</option></select></div>
                              {editingWord.word_type === 'Noun' && (<div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Article (Gender)</label><select value={editingWord.gender || 'der'} onChange={e => setEditingWord({...editingWord, gender: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none dark:text-white"><option value="der">der (M)</option><option value="die">die (F)</option><option value="das">das (N)</option></select></div>)}
                              {editingWord.word_type === 'Verb' && (<div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Verb Type</label><select value={editingWord.verb_type || 'Regular'} onChange={e => setEditingWord({...editingWord, verb_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none dark:text-white"><option value="Regular">Regular (Schwach)</option><option value="Irregular">Irregular (Stark)</option><option value="Separable Regular">Separable Regular</option><option value="Separable Irregular">Separable Irregular</option><option value="Modal">Modal</option></select></div>)}
                          </div>
                        )}
                        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">{langMode === 'en' ? 'Word / Phrase' : 'German Term'}</label><input type="text" value={editingWord.word} onChange={e => setEditingWord({...editingWord, word: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none dark:text-white" required /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">{langMode === 'en' ? 'Definition' : 'English Translation'}</label><input type="text" value={editingWord.translation || editingWord.definition || ''} onChange={e => setEditingWord({...editingWord, translation: e.target.value, definition: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none dark:text-white" required /></div>
                        {langMode === 'de' && editingWord.word_type === 'Noun' && (<div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Plural Form</label><input type="text" value={editingWord.plural_form || ''} onChange={e => setEditingWord({...editingWord, plural_form: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium outline-none dark:text-white" /></div>)}
                        {langMode === 'de' && editingWord.word_type === 'Verb' && (
                            <>
                                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Present Conjugations</label><input type="text" value={editingWord.conjugation || ''} onChange={e => setEditingWord({...editingWord, conjugation: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium outline-none dark:text-white" /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Präteritum</label><input type="text" value={editingWord.praeteritum || ''} onChange={e => setEditingWord({...editingWord, praeteritum: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium outline-none dark:text-white" /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Perfekt</label><input type="text" value={editingWord.perfekt || ''} onChange={e => setEditingWord({...editingWord, perfekt: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium outline-none dark:text-white" /></div>
                            </>
                        )}
                        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-800"><button type="button" onClick={() => setEditingWord(null)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm">Cancel</button><button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-sm transition-colors text-sm">Update Database</button></div>
                    </form>
                </div>
             </div>
          )}
        </div>
      )}

      {activeTab === 'drill' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4">
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-h-[70vh] flex flex-col">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Select Target Words (Max 3)</h3>
                  <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-2 custom-scrollbar">
                  {vocabList.map(v => {
                      const isSelected = selectedWords.find(sw => sw.id === v.id)
                      return (
                      <button key={v.id} onClick={() => toggleWordSelection(v)} className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border flex flex-col", isSelected ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300")}>
                          <div className="flex items-center gap-2">{v.gender && <span className={cn("text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider", getGenderColor(v.gender))}>{v.gender}</span>}<span className="text-sm">{v.word}</span></div>
                          <span className={cn("text-xs font-medium mt-1 truncate", isSelected ? "text-indigo-500 dark:text-indigo-400" : "text-slate-500 dark:text-slate-500")}>{v.translation || v.definition}</span>
                      </button>
                      )
                  })}
                  </div>
                  <button onClick={generateChallenge} disabled={selectedWords.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"><Target size={16} /> Generate Challenge</button>
              </div>
              <div className="lg:col-span-8 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <p className="text-base font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{drillScenario || "Select your target vocabulary from the left and initiate the drill."}</p>
                  </div>
                  {isDrilling && drillScenario && (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <textarea value={userSentence} onChange={e => setUserSentence(e.target.value)} placeholder="Type your sentence here..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white resize-none h-32 mb-4" />
                          <button onClick={gradeSentence} disabled={!userSentence} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 text-sm"><Send size={16} /> Submit for Grading</button>
                      </div>
                  )}
                  {feedback && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/30">
                          <div className="prose dark:prose-invert max-w-none text-sm font-medium text-slate-700 dark:text-slate-300">{feedback}</div>
                      </div>
                  )}
              </div>
          </div>
      )}
      
      {/* 🎯 THE FIX: Notes Drawer stabilized and fully functional outside conditional blocks */}
      {isNotesDrawerOpen && <NotesDrawer notes={globalNotes} onClose={() => setIsNotesDrawerOpen(false)} search={noteSearch} setSearch={setNoteSearch} />}
    </div>
  )
}

function NotesDrawer({ notes, onClose, search, setSearch }: { notes: any[], onClose: () => void, search: string, setSearch: (val: string) => void }) {
    const filteredNotes = notes.filter(n => 
        (n.concept || '').toLowerCase().includes(search.toLowerCase()) || 
        (n.details || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[500] flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 slide-in-from-right-full">
                
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Library className="text-indigo-500" size={20} /> Global Notes</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-all"><X size={16} /></button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Search all notes and concepts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white shadow-inner" autoFocus />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100 dark:bg-slate-950 custom-scrollbar">
                    {filteredNotes.length > 0 ? filteredNotes.map((note, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{note.concept}</h4>
                            </div>
                            <div 
                                className="p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-x-auto global-notes-content whitespace-pre-wrap"
                            >
                                {note.details}
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400"><Library size={48} className="mb-4 opacity-20" /><p className="text-sm font-bold">No concepts found.</p></div>
                    )}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .global-notes-content h1, .global-notes-content h2, .global-notes-content h3 { font-weight: 800; color: inherit; margin-top: 1rem; margin-bottom: 0.5rem; }
                .global-notes-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
                .global-notes-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
                .global-notes-content strong { font-weight: bold; color: inherit; }
                .global-notes-content p { margin-bottom: 1rem; }
                .global-notes-content p:last-child { margin-bottom: 0; }
            `}} />
        </div>
    )
}