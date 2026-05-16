'use client'

import { useState } from 'react'
import { BookOpen, Search, ChevronRight, CheckCircle2, AlertTriangle, Zap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabaseClient'

export default function LearnPage() {
  const [topicInput, setTopicInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [courseData, setCourseData] = useState<any>(null)
  const [activeChapter, setActiveChapter] = useState(0)
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizStatus, setQuizStatus] = useState<'idle' | 'evaluating' | 'correct' | 'incorrect'>('idle')

  const generateCourse = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!topicInput.trim()) return
      
      setIsGenerating(true)
      setCourseData(null); setActiveChapter(0); setSelectedAnswer(null); setQuizStatus('idle')

      try {
          const res = await fetch('/api/ai-learning', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic: topicInput })
          })
          const data = await res.json()
          if (data.course) setCourseData(data.course)
      } catch (err) { alert("Failed to generate course.") }
      setIsGenerating(false)
  }

  const awardXP = async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
      if (profile) await supabase.from('profiles').update({ xp: (profile.xp || 0) + amount }).eq('id', user.id);
  };

  const handleQuizSubmit = () => {
      if (selectedAnswer === null || !courseData) return;
      setQuizStatus('evaluating');
      setTimeout(() => {
          if (selectedAnswer === courseData.finalQuiz.correctIndex) {
              setQuizStatus('correct'); awardXP(100);
          } else setQuizStatus('incorrect');
      }, 800);
  }

  return (
    <div className="w-full pb-32 animate-in fade-in duration-500">
      <header className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-8 mt-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
             <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20"><BookOpen className="text-indigo-600 dark:text-indigo-400" size={24} /></div>
             Deep Dive Engine
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-sm">On-demand curriculum architect.</p>
      </header>

      {!courseData && (
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-2xl shadow-sm text-center mt-12">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mx-auto rounded-xl flex items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-500/20"><Target size={24} /></div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">What do you want to master?</h2>
              <p className="text-slate-500 font-medium mb-8 text-sm max-w-lg mx-auto">Input any topic. The AI will forge a structured, multi-chapter mini-course in seconds. e.g., "The Complete History of Indian Cricket" or "How Quantum Computers Work".</p>
              
              <form onSubmit={generateCourse} className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Search size={18} /></div>
                  <input type="text" placeholder="Design a course on..." value={topicInput} onChange={(e) => setTopicInput(e.target.value)} disabled={isGenerating} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-6 py-4 text-sm font-semibold outline-none focus:border-indigo-500 dark:text-white transition-colors shadow-inner disabled:opacity-50" />
                  <button type="submit" disabled={isGenerating || !topicInput} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">{isGenerating ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Architecting Syllabus...</span> : "Generate Course"}</button>
              </form>
          </div>
      )}

      {courseData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8">
              <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-4">
                  <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
                      <h3 className="font-bold text-base mb-2 leading-tight">{courseData.title}</h3>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">{courseData.overview}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col gap-1.5">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 pt-2 pb-1.5">Syllabus</h4>
                      {courseData.chapters.map((chap: any, idx: number) => (
                          <button key={idx} onClick={() => setActiveChapter(idx)} className={cn("text-left px-3 py-2.5 rounded-lg font-semibold text-xs transition-colors", activeChapter === idx ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>{idx + 1}. {chap.title}</button>
                      ))}
                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                      <button onClick={() => setActiveChapter(courseData.chapters.length)} className={cn("text-left px-3 py-2.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2", activeChapter === courseData.chapters.length ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}><Zap size={14} className={activeChapter === courseData.chapters.length ? "text-emerald-500" : "text-slate-400"}/> Final Knowledge Check</button>
                  </div>
                  <button onClick={() => setCourseData(null)} className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs py-4 transition-colors">Start a New Topic</button>
              </div>

              <div className="lg:col-span-9 xl:col-span-9">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-2xl shadow-sm min-h-[500px] flex flex-col relative overflow-hidden">
                      {activeChapter < courseData.chapters.length ? (
                          <div className="animate-in fade-in duration-500">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-3 block">Chapter {activeChapter + 1}</span>
                              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">{courseData.chapters[activeChapter].title}</h2>
                              <div className="text-slate-700 dark:text-slate-300 font-medium text-sm md:text-base leading-relaxed space-y-5 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: courseData.chapters[activeChapter].content }} />
                              <div className="mt-10 p-5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-xl">
                                  <h4 className="text-indigo-800 dark:text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-1.5">Key Takeaway</h4>
                                  <p className="text-indigo-900 dark:text-indigo-200 font-semibold text-sm leading-relaxed">{courseData.chapters[activeChapter].keyTakeaway}</p>
                              </div>
                              <div className="mt-8 flex justify-end">
                                  <button onClick={() => setActiveChapter(prev => prev + 1)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:-translate-y-0.5 transition-all flex items-center gap-2">
                                      {activeChapter === courseData.chapters.length - 1 ? "Take Final Quiz" : "Next Chapter"} <ChevronRight size={16} />
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="animate-in slide-in-from-right-8 duration-500 h-full flex flex-col justify-center max-w-2xl mx-auto">
                              <div className="text-center mb-8">
                                  <div className="w-12 h-12 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-800/50"><Zap size={20} /></div>
                                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">Knowledge Check</h2>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{courseData.finalQuiz.question}</p>
                              </div>
                              <div className="flex flex-col gap-3 mb-8 w-full">
                                  {courseData.finalQuiz.options.map((opt: string, idx: number) => (
                                      <button 
                                          key={idx} onClick={() => quizStatus === 'idle' && setSelectedAnswer(idx)} disabled={quizStatus !== 'idle'}
                                          className={cn("p-4 rounded-xl border text-left font-semibold transition-all text-sm", 
                                              selectedAnswer === idx ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-slate-600",
                                              (quizStatus === 'correct' || quizStatus === 'incorrect') && idx === courseData.finalQuiz.correctIndex ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "",
                                              quizStatus === 'incorrect' && selectedAnswer === idx ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" : ""
                                          )}
                                      >
                                          {opt}
                                      </button>
                                  ))}
                              </div>
                              {quizStatus === 'idle' && selectedAnswer !== null && <button onClick={handleQuizSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm text-sm">Submit Answer</button>}
                              {quizStatus === 'correct' && (
                                  <div className="text-center animate-in zoom-in-95 bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                                      <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2"><CheckCircle2 size={20} /> <span className="font-bold text-sm uppercase tracking-widest">Correct! (+100 XP)</span></div>
                                      <p className="text-emerald-800 dark:text-emerald-200 font-medium text-xs leading-relaxed">{courseData.finalQuiz.explanation}</p>
                                  </div>
                              )}
                              {quizStatus === 'incorrect' && (
                                  <div className="text-center animate-in zoom-in-95 bg-red-50 dark:bg-red-900/10 p-5 rounded-xl border border-red-200 dark:border-red-800/50">
                                      <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-2"><AlertTriangle size={20} /> <span className="font-bold text-sm uppercase tracking-widest">Incorrect</span></div>
                                      <p className="text-red-800 dark:text-red-200 font-medium text-xs mb-3">The correct answer was option {courseData.finalQuiz.correctIndex + 1}.</p>
                                      <p className="text-slate-700 dark:text-slate-300 font-medium text-xs leading-relaxed">{courseData.finalQuiz.explanation}</p>
                                      <button onClick={() => {setQuizStatus('idle'); setSelectedAnswer(null)}} className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white underline underline-offset-4">Try Again</button>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}