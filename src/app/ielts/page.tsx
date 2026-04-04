'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PenTool, Target, Clock, Activity, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, Sparkles, Wand2, Archive, Trash2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IELTSPrompt { text: string; image: string | null; }

export default function IELTSForgePage() {
  const [activeTab, setActiveTab] = useState<'forge' | 'history'>('forge')
  const [taskType, setTaskType] = useState<'Task 1 (Academic)' | 'Task 2 (Essay)'>('Task 2 (Essay)')
  
  const [currentPrompt, setCurrentPrompt] = useState<IELTSPrompt>({ text: "Initializing authentic prompt...", image: null })
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  
  const [essay, setEssay] = useState('')
  const [timeLeft, setTimeLeft] = useState(40 * 60) 
  const [timerActive, setTimerActive] = useState(false)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [viewingHistoricalLog, setViewingHistoricalLog] = useState<any>(null)

  const wordCount = essay.trim().split(/\s+/).filter(w => w.length > 0).length
  const targetWords = taskType === 'Task 1 (Academic)' ? 150 : 250

  useEffect(() => { 
      generateNewPrompt('Task 2 (Essay)')
      fetchHistory() 
  }, [])

  useEffect(() => {
      let interval: any = null;
      if (timerActive && timeLeft > 0) interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
      else if (timeLeft === 0) setTimerActive(false);
      return () => clearInterval(interval);
  }, [timerActive, timeLeft])

  const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('ielts_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (data) setHistoryLogs(data)
  }

  const deleteHistory = async (id: number) => {
      if(!confirm("Permanently delete this test record?")) return
      await supabase.from('ielts_history').delete().eq('id', id)
      if (viewingHistoricalLog?.id === id) setViewingHistoricalLog(null)
      fetchHistory()
  }

  const saveToHistory = async (feedbackData: any, promptText: string, promptImage: string | null, finalEssay: string, words: number, type: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('ielts_history').insert([{
          user_id: user.id, task_type: type, prompt_text: promptText, prompt_image: promptImage,
          essay: finalEssay, word_count: words, overall_band: feedbackData.overallBand, feedback_data: feedbackData
      }])
      fetchHistory()
  }

  const handleTaskSwitch = (type: 'Task 1 (Academic)' | 'Task 2 (Essay)') => {
      if (type === taskType) return;
      setTaskType(type)
      generateNewPrompt(type)
  }

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60); const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // 🎯 THE FIX: Hard Reset Protocol on New Prompt
  const generateNewPrompt = async (typeToGenerate = taskType) => {
      setIsGeneratingPrompt(true)
      
      // 1. Wipe the Slate Clean
      setFeedback(null)
      setEssay('')
      setTimerActive(false)
      setTimeLeft(typeToGenerate === 'Task 1 (Academic)' ? 20 * 60 : 40 * 60)
      setErrorMsg('')
      
      setCurrentPrompt({ text: "Mining authentic past papers...", image: null })
      
      try {
          const res = await fetch('/api/ielts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "generate_prompt", taskType: typeToGenerate })
          })
          const data = await res.json()
          if (data.prompt) setCurrentPrompt(data.prompt)
          else setCurrentPrompt({ text: "Failed to generate prompt. Please try again.", image: null })
      } catch (err) {
          setCurrentPrompt({ text: "Network error while fetching prompt.", image: null })
      }
      setIsGeneratingPrompt(false)
  }

  const submitForGrading = async () => {
      if (wordCount < 20) return setErrorMsg("Commander, write at least 20 words before requesting an analysis.");
      
      // 2. Lock the Environment during submission
      setTimerActive(false)
      setIsAnalyzing(true)
      setErrorMsg('')
      setFeedback(null)

      try {
          const res = await fetch('/api/ielts', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskType, prompt: currentPrompt.text, essay, wordCount }) 
          })
          const data = await res.json()
          
          if (res.ok && data.analysis) {
              setFeedback(data.analysis)
              await saveToHistory(data.analysis, currentPrompt.text, currentPrompt.image, essay, wordCount, taskType)
          }
          else setErrorMsg(data.error || "Analysis failed.")
      } catch (err) {
          setErrorMsg("Connection to AI Examiner lost.")
      }
      setIsAnalyzing(false)
  }

  const DashboardView = ({ data, promptData, userEssay, isHistoryView = false }: any) => (
      <div className="space-y-6 animate-in fade-in duration-700">
          {isHistoryView && (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm mb-6">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Prompt</h4>
                 {promptData.image && <img src={promptData.image} alt="Chart" className="w-full max-w-sm mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white" />}
                 <p className="text-slate-800 dark:text-slate-200 font-medium mb-6">{promptData.text}</p>
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Your Essay</h4>
                 <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">{userEssay}</p>
              </div>
          )}

          <div className="bg-gradient-to-br from-indigo-600 to-violet-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={120} /></div>
              <h2 className="text-indigo-100 font-bold uppercase tracking-widest text-sm mb-2">Overall Band Score</h2>
              <div className="text-7xl font-black mb-4">{data.overallBand.toFixed(1)}</div>
              <p className="text-indigo-100 font-medium leading-relaxed max-w-md">Scored against official Cambridge rubrics.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                  { title: "Task Response", key: "taskResponse", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                  { title: "Coherence & Cohesion", key: "coherence", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
                  { title: "Lexical Resource", key: "lexical", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                  { title: "Grammar & Accuracy", key: "grammatical", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" }
              ].map((item) => (
                  <div key={item.key} className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                          <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm">{item.title}</h3>
                          <span className={cn("font-black text-lg px-2 py-0.5 rounded-lg", item.bg, item.color)}>{data[item.key].score.toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{data[item.key].feedback}</p>
                  </div>
              ))}
          </div>

          {data.fullRewrite && (
              <div className="bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-900/10 dark:to-[#0f172a] border border-emerald-200 dark:border-emerald-900/50 p-6 md:p-8 rounded-[2rem] shadow-lg relative overflow-hidden">
                  <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mb-6"><Sparkles className="text-emerald-500" /> Master Examiner Rewrite (Band 9)</h3>
                  <div className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {data.fullRewrite.split('\n').map((paragraph: string, idx: number) => {
                          if (!paragraph.trim()) return null;
                          return <p key={idx} className="mb-4 last:mb-0">{paragraph}</p>;
                      })}
                  </div>
              </div>
          )}

          <div className="bg-white dark:bg-[#0f172a] border border-red-100 dark:border-red-900/30 p-6 md:p-8 rounded-[2rem] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6"><AlertTriangle className="text-red-500" /> Weakest Link Analysis</h3>
              <div className="space-y-6">
                  <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Original Sentence</div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-600 dark:text-slate-300 font-medium line-through decoration-red-500/50">{data.weakestLink.originalSentence}</div>
                  </div>
                  <div className="pl-6 border-l-2 border-indigo-200 dark:border-indigo-800">
                      <div className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">Band 9 Rewrite</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white mb-2">{data.weakestLink.rewrite}</div>
                      <p className="text-sm text-slate-500 font-medium">{data.weakestLink.explanation}</p>
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6"><TrendingUp className="text-emerald-500" /> C1/C2 Lexical Upgrades</h3>
              <div className="space-y-3">
                  {data.vocabularyUpgrades.map((vocab: any, i: number) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3 shrink-0">
                              <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-bold text-sm rounded-lg line-through">{vocab.basic}</span>
                              <ChevronRight size={16} className="text-slate-300" />
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-black text-sm rounded-lg">{vocab.advanced}</span>
                          </div>
                          <span className="text-sm text-slate-500 font-medium">{vocab.context}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  )

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8 relative">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <PenTool className="text-indigo-600" size={36} /> The Band 9 Forge
          </h1>
          <p className="text-slate-500 font-medium mt-2">Authentic past papers & objective examiner analysis.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
           <button onClick={() => {setActiveTab('forge'); setViewingHistoricalLog(null);}} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === 'forge' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>The Forge</button>
           <button onClick={() => setActiveTab('history')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2", activeTab === 'history' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><Archive size={16}/> The Vault</button>
        </div>
      </header>

      {/* ==================== THE FORGE TAB ==================== */}
      {activeTab === 'forge' && (
        <>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit mb-8 border border-slate-200 dark:border-slate-800">
               <button onClick={() => handleTaskSwitch('Task 1 (Academic)')} className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", taskType === 'Task 1 (Academic)' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Task 1 (150w)</button>
               <button onClick={() => handleTaskSwitch('Task 2 (Essay)')} className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", taskType === 'Task 2 (Essay)' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Task 2 (250w)</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className={cn("flex flex-col gap-6 transition-all duration-500", feedback ? "lg:col-span-5" : "lg:col-span-8 lg:col-start-3")}>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 md:p-8 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50 shadow-inner relative group">
                        <div className="flex justify-between items-center mb-6">
                            <span className="font-black text-indigo-900 dark:text-indigo-300 tracking-wider uppercase text-xs flex items-center gap-2"><Target size={14}/> Authentic Assignment</span>
                            <button onClick={() => generateNewPrompt(taskType)} disabled={isGeneratingPrompt} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                                <Wand2 size={14} className={isGeneratingPrompt ? "animate-spin" : ""} /> {isGeneratingPrompt ? 'Forging...' : 'New Prompt'}
                            </button>
                        </div>
                        {currentPrompt.image && (
                            <div className="mb-6 rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800 bg-white shadow-sm">
                                <img src={currentPrompt.image} alt="IELTS Task 1 Graphic" className="w-full object-contain max-h-[300px] p-4" />
                            </div>
                        )}
                        <p className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{currentPrompt.text}</p>
                    </div>

                    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl overflow-hidden flex flex-col relative">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                {/* 3. Lock the timer logic based on analysis state */}
                                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black tracking-widest font-mono transition-colors", timerActive ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400", (feedback || isAnalyzing) ? "opacity-50 cursor-not-allowed" : "cursor-pointer")} onClick={() => { if (!feedback && !isAnalyzing) setTimerActive(!timerActive) }}>
                                    <Clock size={16} /> {formatTime(timeLeft)}
                                </div>
                            </div>
                            <div className={cn("text-sm font-bold px-3 py-1 rounded-lg transition-colors", wordCount >= targetWords ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                                {wordCount} / {targetWords} words
                            </div>
                        </div>

                        <textarea 
                            value={essay}
                            onChange={(e) => setEssay(e.target.value)}
                            disabled={isAnalyzing || feedback !== null}
                            placeholder="Type your response here..."
                            className="w-full h-[500px] p-6 md:p-8 text-base md:text-lg leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent resize-none outline-none placeholder:text-slate-400 font-medium disabled:opacity-50"
                            spellCheck={false} 
                        />

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                            <span className="text-red-500 font-bold text-sm">{errorMsg}</span>
                            {!feedback ? (
                                <button onClick={submitForGrading} disabled={isAnalyzing || wordCount < 20} className="ml-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3.5 rounded-xl font-bold shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center gap-2">
                                    {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                    {isAnalyzing ? 'Examiner Reviewing...' : 'Submit Essay'}
                                </button>
                            ) : (
                                <button onClick={() => generateNewPrompt(taskType)} className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2">
                                    <Wand2 size={18} /> Start New Test
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {feedback && (
                    <div className="lg:col-span-7">
                        <DashboardView data={feedback} promptData={currentPrompt} userEssay={essay} />
                    </div>
                )}
            </div>
        </>
      )}

      {/* ==================== THE VAULT TAB ==================== */}
      {activeTab === 'history' && (
         <div className="animate-in slide-in-from-right-4">
             {viewingHistoricalLog ? (
                 <div>
                     <button onClick={() => setViewingHistoricalLog(null)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-6 transition-colors"><ArrowLeft size={16}/> Back to History Log</button>
                     <DashboardView data={viewingHistoricalLog.feedback_data} promptData={{text: viewingHistoricalLog.prompt_text, image: viewingHistoricalLog.prompt_image}} userEssay={viewingHistoricalLog.essay} isHistoryView={true} />
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {historyLogs.length === 0 && <p className="text-slate-500 font-medium italic col-span-full">Your vault is empty. Return to the Forge and complete an assignment.</p>}
                     {historyLogs.map(log => (
                         <div key={log.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group flex flex-col cursor-pointer" onClick={() => setViewingHistoricalLog(log)}>
                             <div className="flex justify-between items-start mb-4">
                                 <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{log.task_type}</span>
                                 <button onClick={(e) => {e.stopPropagation(); deleteHistory(log.id);}} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                             </div>
                             <div className="flex items-center gap-4 mb-4">
                                 <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                                     {log.overall_band.toFixed(1)}
                                 </div>
                                 <div>
                                     <p className="text-xs text-slate-400 font-bold mb-1">{new Date(log.created_at).toLocaleDateString()}</p>
                                     <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{log.prompt_text}</p>
                                 </div>
                             </div>
                             <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500">
                                 {log.word_count} Words Written
                             </div>
                         </div>
                     ))}
                 </div>
             )}
         </div>
      )}
    </div>
  )
}