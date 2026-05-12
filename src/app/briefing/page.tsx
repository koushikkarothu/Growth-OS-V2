'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Globe, RefreshCw, ChevronRight, History, Users, TrendingUp, Compass, MessageSquare, Send, X, ShieldAlert, Zap, Target, BookmarkPlus, BookmarkCheck, Library, Plus, Wand2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import CreateNoteModal from '@/components/CreateNoteModal'

interface Briefing { id?: string; category: string; headline: string; summary: string; tags: string[]; is_saved?: boolean; fetched_date?: string }
interface DeepDiveSection { heading: string; content: string; icon: string }
interface ChatMsg { role: 'user' | 'ai'; text: string }

export default function BriefingPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [activeBriefing, setActiveBriefing] = useState<Briefing | null>(null)
  const [deepDive, setDeepDive] = useState<{ sections: DeepDiveSection[] } | null>(null)
  const [isDiving, setIsDiving] = useState(false)

  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 🎯 Vocab & Vault State
  const [showVocabModal, setShowVocabModal] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [vocabLang, setVocabLang] = useState<'en' | 'de'>('en')
  const [vWord, setVWord] = useState(''); const [vTrans, setVTrans] = useState('')
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [isSavingVocab, setIsSavingVocab] = useState(false)

  useEffect(() => { initializeFeed() }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  // 🎯 Ephemeral Memory Protocol
  const initializeFeed = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // 1. Silent Cleanup: Delete unsaved news from previous days
      await supabase.from('daily_briefings').delete().eq('user_id', user.id).eq('is_saved', false).neq('fetched_date', today);

      // 2. Load today's news OR saved archives
      const { data } = await supabase.from('daily_briefings')
          .select('*')
          .eq('user_id', user.id)
          .or(`fetched_date.eq.${today},is_saved.eq.true`)
          .order('created_at', { ascending: false });

      if (data && data.length > 0) setBriefings(data);
      else await fetchNewBriefings(user.id, today);
      
      setIsLoading(false);
  }

  const fetchNewBriefings = async (userId: string, todayStr: string) => {
      setIsLoading(true);
      try {
          const res = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch_briefing' }) })
          const data = await res.json()
          if (data.data) {
              const newBriefings = data.data.map((b: any) => ({
                  user_id: userId, category: b.category, headline: b.headline, summary: b.summary, tags: b.tags, fetched_date: todayStr, is_saved: false
              }));
              const { data: inserted } = await supabase.from('daily_briefings').insert(newBriefings).select();
              if (inserted) setBriefings(prev => [...inserted, ...prev]);
          }
      } catch (e) { alert("Network Error.") }
      setIsLoading(false);
  }

  const toggleSave = async (item: Briefing, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!item.id) return;
      const newStatus = !item.is_saved;
      await supabase.from('daily_briefings').update({ is_saved: newStatus }).eq('id', item.id);
      setBriefings(prev => prev.map(b => b.id === item.id ? { ...b, is_saved: newStatus } : b));
  }

  const openDeepDive = async (briefing: Briefing) => {
      setActiveBriefing(briefing); setDeepDive(null); setIsDiving(true); setChatHistory([]);
      try {
          const res = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deep_dive', headline: briefing.headline }) })
          const data = await res.json()
          if (data.data) setDeepDive(data.data)
      } catch (e) { alert("Failed to extract context.") }
      setIsDiving(false)
  }

  const sendInterrogation = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatting || !activeBriefing) return;
      const userQ = chatInput;
      setChatHistory(prev => [...prev, { role: 'user', text: userQ }]);
      setChatInput(''); setIsChatting(true);
      try {
          const res = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'interrogate', headline: activeBriefing.headline, context: deepDive, question: userQ }) })
          const data = await res.json()
          if (data.answer) setChatHistory(prev => [...prev, { role: 'ai', text: data.answer }])
      } catch (e) { setChatHistory(prev => [...prev, { role: 'ai', text: "Neural link disrupted." }]) }
      setIsChatting(false)
  }

  // 🎯 Vocab Extractor (Identical to Theater fixes)
  async function autoFillQuickVocab() {
      if (!vWord.trim()) return;
      setIsAutoFilling(true);
      const customPrompt = vocabLang === 'de' 
        ? `Analyze German word "${vWord}". Return ONLY JSON: {"translation":"mean","word_type":"Noun","gender":"der","plural":"...","conjugation":"..."}`
        : `Provide a short dictionary definition for the English word "${vWord}". Return ONLY plain text. No JSON.`
      try {
          const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: customPrompt, expectJson: vocabLang === 'de' }) })
          const data = await res.json()
          if (data.result) {
              if (vocabLang === 'en') setVTrans(data.result);
              else if (data.result.translation) setVTrans(data.result.translation);
          }
      } catch (e) {}
      setIsAutoFilling(false);
  }

  async function saveQuickVocab(e: React.FormEvent) {
      e.preventDefault(); setIsSavingVocab(true);
      const { data: { user } } = await supabase.auth.getUser()
      if (vocabLang === 'en') await supabase.from('vocabulary').insert([{ user_id: user?.id, word: vWord, definition: vTrans }])
      else await supabase.from('german_vocabulary').insert([{ user_id: user?.id, word: vWord, translation: vTrans }])
      setIsSavingVocab(false); setShowVocabModal(false); setVWord(''); setVTrans('');
  }

  const renderIcon = (iconName: string) => {
      switch (iconName.toLowerCase()) {
          case 'history': return <History size={14}/>;
          case 'users': return <Users size={14}/>;
          case 'alert': return <ShieldAlert size={14}/>;
          case 'trending': return <TrendingUp size={14}/>;
          case 'zap': return <Zap size={14}/>;
          default: return <Target size={14}/>;
      }
  }

  const groupedBriefings = briefings.reduce((acc: any, curr: Briefing) => {
      const group = curr.is_saved ? 'Archived Intelligence' : curr.category;
      if (!acc[group]) acc[group] = [];
      acc[group].push(curr); return acc;
  }, {});

  return (
    <div className="max-w-screen-2xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      
      <CreateNoteModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onNoteAdded={() => setIsSaveModalOpen(false)} initialData={activeBriefing ? { topic: activeBriefing.category, concept: activeBriefing.headline, details: `${activeBriefing.summary}\n\nDeep Dive Data: ${JSON.stringify(deepDive?.sections)}` } : null} />

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 mt-4 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight"><Globe className="text-indigo-600 dark:text-indigo-400" size={36} /> Intelligence Radar</h1>
          <p className="text-slate-500 font-bold mt-3 text-sm tracking-wide uppercase">Live Web Feed • Ephemeral Storage</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowVocabModal(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-2xl font-bold transition-all shadow-sm hover:shadow-md"><Plus size={18}/> Vocab</button>
            <button onClick={async () => { const { data: { user } } = await supabase.auth.getUser(); if(user) fetchNewBriefings(user.id, new Date().toISOString().split('T')[0]); }} disabled={isLoading} className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1 disabled:opacity-50">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> Update Feed
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* THE FEED (LEFT PANE) */}
          <div className={cn("flex flex-col gap-8 transition-all duration-500", activeBriefing ? "xl:col-span-5 hidden xl:flex overflow-y-auto h-[calc(100vh-12rem)] pr-2 custom-scrollbar" : "xl:col-span-12")}>
              
              {isLoading && briefings.length === 0 && <div className="h-96 flex flex-col items-center justify-center text-indigo-500 opacity-50 w-full xl:col-span-12"><Globe size={64} className="animate-pulse mb-4" /><span className="font-black tracking-widest uppercase text-sm">Synthesizing Live Web Data...</span></div>}
              
              {Object.keys(groupedBriefings).sort((a,b) => a === 'Archived Intelligence' ? -1 : 1).map((category) => (
                  <div key={category} className="space-y-4">
                      <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">{category === 'Archived Intelligence' ? <BookmarkCheck className="text-emerald-500" size={18}/> : <TrendingUp className="text-indigo-500" size={18}/>} {category}</h2>
                      <div className={cn("grid gap-4", activeBriefing ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                          {groupedBriefings[category].map((item: Briefing, idx: number) => (
                              <div key={idx} onClick={() => openDeepDive(item)} className={cn("bg-white dark:bg-[#0f172a] p-5 rounded-[1.5rem] border transition-all cursor-pointer group flex flex-col shadow-sm hover:shadow-xl", activeBriefing?.id === item.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700")}>
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 truncate max-w-[70%]">{item.category}</span>
                                      <button onClick={(e) => toggleSave(item, e)} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                          {item.is_saved ? <BookmarkCheck size={18} className="text-emerald-500 fill-emerald-500/20"/> : <BookmarkPlus size={18}/>}
                                      </button>
                                  </div>
                                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-3">{item.headline}</h3>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3 flex-1">{item.summary}</p>
                                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-auto">
                                      <div className="flex gap-2 truncate pr-2">{item.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] font-bold text-slate-400">#{t}</span>)}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>

          {/* THE DEEP DIVE & INTERROGATION (RIGHT PANE) */}
          {activeBriefing && (
              <div className="xl:col-span-7 flex flex-col gap-4 animate-in slide-in-from-right-8 duration-500 h-[calc(100vh-12rem)] sticky top-8">
                  
                  <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl shadow-lg">
                      <span className="font-bold text-sm truncate pr-4 flex-1">{activeBriefing.headline}</span>
                      <div className="flex items-center gap-2 shrink-0 border-l border-slate-700 pl-4">
                          <button onClick={() => setIsSaveModalOpen(true)} title="Save to Vault" className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"><Save size={16}/></button>
                          <button onClick={() => setActiveBriefing(null)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><X size={16}/></button>
                      </div>
                  </div>

                  <div className="flex-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
                      
                      {/* DYNAMIC TOP HALF */}
                      <div className="h-[55%] overflow-y-auto p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                          {isDiving ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400"><Compass size={40} className="animate-spin-slow mb-4 opacity-50" /><span className="font-bold text-sm uppercase tracking-widest animate-pulse">Adapting Analytical Framework...</span></div>
                          ) : deepDive ? (
                              <div className="space-y-8">
                                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight mb-8">{activeBriefing.headline}</h2>
                                  <div className="relative pl-6 border-l-2 border-indigo-500 space-y-8">
                                      {deepDive.sections.map((section, idx) => (
                                          <div key={idx}>
                                              <div className="absolute left-[-17px] w-8 h-8 bg-slate-200 dark:bg-slate-800 text-indigo-500 rounded-full flex items-center justify-center border border-slate-300 dark:border-slate-700 mt-[-4px]">{renderIcon(section.icon)}</div>
                                              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">{section.heading}</h3>
                                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{section.content}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ) : null}
                      </div>

                      {/* BOTTOM HALF: INTERROGATION */}
                      <div className="h-[45%] flex flex-col bg-white dark:bg-[#0f172a] relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"><MessageSquare size={12}/> Interrogation Room</div>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-10">
                              {chatHistory.length === 0 && !isDiving && <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 text-center px-8"><MessageSquare size={32} className="mb-3" /><p className="text-sm font-bold">Interrogate the AI. Extract deeper insights.</p></div>}
                              {chatHistory.map((msg, idx) => (
                                  <div key={idx} className={cn("max-w-[85%] rounded-2xl px-5 py-3 text-sm font-medium leading-relaxed", msg.role === 'user' ? "ml-auto bg-indigo-600 text-white rounded-tr-sm" : "mr-auto bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700")}>{msg.text}</div>
                              ))}
                              {isChatting && <div className="mr-auto bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-5 py-3 border border-slate-200 dark:border-slate-700"><span className="flex gap-1"><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"/><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"/><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"/></span></div>}
                              <div ref={chatEndRef} />
                          </div>
                          <form onSubmit={sendInterrogation} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                              <input type="text" placeholder="Type query..." value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isChatting || isDiving} className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white shadow-inner disabled:opacity-50" />
                              <button type="submit" disabled={isChatting || isDiving || !chatInput.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white w-12 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shadow-md"><Send size={18} className="ml-1"/></button>
                          </form>
                      </div>
                  </div>
              </div>
          )}

          {/* Quick Vocab Modal */}
          {showVocabModal && (
              <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
                      <button onClick={() => setShowVocabModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                      <h3 className="text-xl font-black text-white mb-4">Log New Word</h3>
                      <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
                          <button onClick={() => setVocabLang('en')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", vocabLang === 'en' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}>🇬🇧 English</button>
                      </div>
                      <form onSubmit={saveQuickVocab} className="space-y-4">
                          <div className="relative">
                            <input type="text" placeholder="Word / Phrase" value={vWord} onChange={e => setVWord(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                            <button type="button" onClick={autoFillQuickVocab} disabled={isAutoFilling || !vWord} title="AI Auto-Fill Details" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white p-1 rounded-lg transition-all disabled:opacity-50"><Wand2 size={18} className={isAutoFilling ? "animate-spin" : ""} /></button>
                          </div>
                          <input type="text" placeholder="Definition" value={vTrans} onChange={e => setVTrans(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                          <button type="submit" disabled={isSavingVocab || !vWord || !vTrans} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold shadow-md transition-all">Secure to Vault</button>
                      </form>
                  </div>
              </div>
          )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }`}} />
    </div>
  )
}