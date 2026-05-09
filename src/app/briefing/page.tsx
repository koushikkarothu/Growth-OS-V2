'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Globe, RefreshCw, ChevronRight, History, Users, TrendingUp, Compass, MessageSquare, Send, X, ShieldAlert, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Briefing { id?: string; category: string; headline: string; summary: string; tags: string[] }
interface DeepDive { genesis: string; keyPlayers: string; analystConsensus: string; futureTrajectory: string }
interface ChatMsg { role: 'user' | 'ai'; text: string }

export default function BriefingPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [activeBriefing, setActiveBriefing] = useState<Briefing | null>(null)
  const [deepDive, setDeepDive] = useState<DeepDive | null>(null)
  const [isDiving, setIsDiving] = useState(false)

  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadTodaysBriefings() }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  // 🎯 DB PROTOCOL: Load from vault first
  const loadTodaysBriefings = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('daily_briefings')
          .select('*')
          .eq('user_id', user.id)
          .eq('fetched_date', today)
          .order('created_at', { ascending: false });

      if (data && data.length > 0) {
          setBriefings(data);
      } else {
          await fetchNewBriefings(user.id, today);
      }
      setIsLoading(false);
  }

  // 🎯 DB PROTOCOL: Fetch from AI and save to vault
  const fetchNewBriefings = async (userId: string, todayStr: string) => {
      setIsLoading(true);
      try {
          const res = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch_briefing' }) })
          const data = await res.json()
          if (data.data) {
              const newBriefings = data.data.map((b: any) => ({
                  user_id: userId, category: b.category, headline: b.headline, summary: b.summary, tags: b.tags, fetched_date: todayStr
              }));
              const { data: insertedData } = await supabase.from('daily_briefings').insert(newBriefings).select();
              if (insertedData) setBriefings(prev => [...insertedData, ...prev]);
          }
      } catch (e) { alert("Failed to secure daily briefing.") }
      setIsLoading(false);
  }

  const handleManualRefresh = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await fetchNewBriefings(user.id, new Date().toISOString().split('T')[0]);
  }

  const openDeepDive = async (briefing: Briefing) => {
      setActiveBriefing(briefing); setDeepDive(null); setIsDiving(true); setChatHistory([]);
      try {
          const res = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deep_dive', headline: briefing.headline }) })
          const data = await res.json()
          if (data.data) setDeepDive(data.data)
      } catch (e) { alert("Failed to extract genesis matrix.") }
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

  // 🎯 UI PROTOCOL: Group by Category
  const groupedBriefings = briefings.reduce((acc: any, curr: Briefing) => {
      if (!acc[curr.category]) acc[curr.category] = [];
      acc[curr.category].push(curr);
      return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-4 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20"><Globe className="text-indigo-600 dark:text-indigo-400" size={32} /></div>
             Intelligence Radar
          </h1>
          <p className="text-slate-500 font-bold mt-3 text-sm tracking-wide uppercase">Global & National Analytical Briefing</p>
        </div>
        <button onClick={handleManualRefresh} disabled={isLoading} className="flex items-center gap-2 bg-slate-900 dark:bg-white border border-slate-800 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1 disabled:opacity-50">
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> {isLoading ? "Scanning..." : "Append New Scans"}
        </button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* THE FEED (LEFT PANE) - NOW CATEGORIZED */}
          <div className={cn("flex flex-col gap-10 transition-all duration-500", activeBriefing ? "xl:col-span-5 hidden xl:flex overflow-y-auto max-h-[calc(100vh-12rem)] pr-4 custom-scrollbar" : "xl:col-span-12")}>
              
              {isLoading && briefings.length === 0 && (
                  <div className="h-96 flex flex-col items-center justify-center text-indigo-500 opacity-50 w-full xl:col-span-12"><Globe size={64} className="animate-pulse mb-4" /><span className="font-black tracking-widest uppercase text-sm">Synthesizing Live Web Data...</span></div>
              )}
              
              {!isLoading && Object.keys(groupedBriefings).map((category) => (
                  <div key={category} className="space-y-4">
                      <h2 className="text-lg font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"><Layers size={18}/> {category}</h2>
                      <div className={cn("grid gap-4", activeBriefing ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                          {groupedBriefings[category].map((item: Briefing, idx: number) => (
                              <div key={idx} onClick={() => openDeepDive(item)} className={cn("bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border transition-all cursor-pointer group flex flex-col", activeBriefing?.id === item.id ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow-xl")}>
                                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-3">{item.headline}</h3>
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3 flex-1">{item.summary}</p>
                                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-4 mt-auto">
                                      <div className="flex gap-2 truncate pr-2">{item.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] font-bold text-slate-400">#{t}</span>)}</div>
                                      <span className="text-indigo-500 font-bold text-xs uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">Analyze <ChevronRight size={14}/></span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>

          {/* THE DEEP DIVE & INTERROGATION (RIGHT PANE) */}
          {activeBriefing && (
              <div className="xl:col-span-7 flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500 h-[calc(100vh-12rem)] sticky top-8">
                  
                  <div className="xl:hidden flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl mb-2">
                      <span className="font-bold text-sm truncate pr-4">{activeBriefing.headline}</span>
                      <button onClick={() => setActiveBriefing(null)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><X size={16}/></button>
                  </div>

                  <div className="flex-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                      
                      <div className="h-[55%] overflow-y-auto p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                          {isDiving ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400"><Compass size={40} className="animate-spin-slow mb-4 opacity-50" /><span className="font-bold text-sm uppercase tracking-widest animate-pulse">Running Deep Web Scan...</span></div>
                          ) : deepDive ? (
                              <div className="space-y-8">
                                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-8">{activeBriefing.headline}</h2>
                                  <div className="relative pl-6 border-l-2 border-indigo-500 space-y-8">
                                      <div className="absolute top-0 left-[-17px] w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center"><History size={14}/></div>
                                      <div><h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">The Genesis (Start Point)</h3><p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{deepDive.genesis}</p></div>
                                      <div className="absolute top-[33%] left-[-17px] w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center"><Users size={14}/></div>
                                      <div><h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Key Players & Motives</h3><p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{deepDive.keyPlayers}</p></div>
                                      <div className="absolute top-[66%] left-[-17px] w-8 h-8 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-full flex items-center justify-center"><ShieldAlert size={14}/></div>
                                      <div><h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Analyst Consensus</h3><p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{deepDive.analystConsensus}</p></div>
                                      <div className="absolute bottom-0 left-[-17px] w-8 h-8 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-full flex items-center justify-center"><TrendingUp size={14}/></div>
                                      <div><h3 className="text-xs font-black uppercase tracking-widest text-purple-500 mb-2">Future Trajectory</h3><p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{deepDive.futureTrajectory}</p></div>
                                  </div>
                              </div>
                          ) : null}
                      </div>

                      <div className="h-[45%] flex flex-col bg-white dark:bg-[#0f172a] relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"><MessageSquare size={12}/> Interrogation Room</div>
                          <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-10">
                              {chatHistory.length === 0 && !isDiving && (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 text-center px-8"><MessageSquare size={32} className="mb-3" /><p className="text-sm font-bold">Ask about historical context, definitions, or implications of this event.</p></div>
                              )}
                              {chatHistory.map((msg, idx) => (
                                  <div key={idx} className={cn("max-w-[85%] rounded-2xl px-5 py-3 text-sm font-medium leading-relaxed", msg.role === 'user' ? "ml-auto bg-indigo-600 text-white rounded-tr-sm" : "mr-auto bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700")}>{msg.text}</div>
                              ))}
                              {isChatting && <div className="mr-auto bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-5 py-3 border border-slate-200 dark:border-slate-700"><span className="flex gap-1"><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"/><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"/><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"/></span></div>}
                              <div ref={chatEndRef} />
                          </div>
                          <form onSubmit={sendInterrogation} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                              <input type="text" placeholder="Interrogate the AI regarding this topic..." value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={isChatting || isDiving} className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white shadow-inner disabled:opacity-50" />
                              <button type="submit" disabled={isChatting || isDiving || !chatInput.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white w-12 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shadow-md"><Send size={18} className="ml-1"/></button>
                          </form>
                      </div>
                  </div>
              </div>
          )}
      </div>
      
      {/* Required for the custom scrollbar on the left pane */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
      `}} />
    </div>
  )
}