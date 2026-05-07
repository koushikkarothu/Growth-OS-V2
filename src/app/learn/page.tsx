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
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      <header className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-8 mt-4">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20"><BookOpen className="text-indigo-600 dark:text-indigo-400" size={32} /></div>
             Deep Dive Engine
          </h1>
          <p className="text-slate-500 font-bold mt-3 text-sm tracking-wide uppercase">ON-DEMAND CURRICULUM ARCHITECT</p>
      </header>

      {!courseData && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-[3rem] shadow-xl text-center mt-10">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 mx-auto rounded-full flex items-center justify-center mb-6"><Target size={32} /></div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">What do you want to master?</h2>
              <p className="text-slate-500 font-medium mb-8 text-sm">Input any topic. The AI will forge a structured, multi-chapter mini-course in seconds. e.g., "The Complete History of Indian Cricket" or "How Quantum Computers Work".</p>
              
              <form onSubmit={generateCourse} className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><Search size={20} /></div>
                  <input type="text" placeholder="Design a course on..." value={topicInput} onChange={(e) => setTopicInput(e.target.value)} disabled={isGenerating} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-14 pr-6 py-5 text-lg font-bold outline-none focus:border-indigo-500 dark:text-white transition-all shadow-inner disabled:opacity-50" />
                  <button type="submit" disabled={isGenerating || !topicInput} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg disabled:opacity-50">{isGenerating ? "Architecting Syllabus..." : "Generate Course"}</button>
              </form>
          </div>
      )}

      {courseData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8">
              <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-lg border border-slate-800">
                      <h3 className="font-black text-xl mb-2">{courseData.title}</h3>
                      <p className="text-slate-400 text-sm font-medium">{courseData.overview}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[2rem] shadow-sm flex flex-col gap-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-2 pb-1">Syllabus</h4>
                      {courseData.chapters.map((chap: any, idx: number) => (
                          <button key={idx} onClick={() => setActiveChapter(idx)} className={cn("text-left px-4 py-3 rounded-xl font-bold text-sm transition-all", activeChapter === idx ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>{idx + 1}. {chap.title}</button>
                      ))}
                      <button onClick={() => setActiveChapter(courseData.chapters.length)} className={cn("text-left px-4 py-3 rounded-xl font-bold text-sm transition-all mt-2 border border-dashed", activeChapter === courseData.chapters.length ? "bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400" : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>🎯 Final Knowledge Check</button>
                  </div>
                  <button onClick={() => setCourseData(null)} className="text-slate-500 font-bold text-sm py-4 hover:text-indigo-500 transition-colors">Start a New Topic</button>
              </div>

              <div className="lg:col-span-8">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-[3rem] shadow-lg min-h-[500px] flex flex-col relative overflow-hidden">
                      {activeChapter < courseData.chapters.length ? (
                          <div className="animate-in fade-in duration-500">
                              <span className="text-indigo-500 font-black uppercase tracking-widest text-xs mb-4 block">Chapter {activeChapter + 1}</span>
                              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-8 leading-tight">{courseData.chapters[activeChapter].title}</h2>
                              <div className="text-slate-700 dark:text-slate-300 font-medium text-lg leading-relaxed space-y-6 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: courseData.chapters[activeChapter].content }} />
                              <div className="mt-12 p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl">
                                  <h4 className="text-emerald-800 dark:text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-2">Key Takeaway</h4>
                                  <p className="text-emerald-900 dark:text-emerald-100 font-bold">{courseData.chapters[activeChapter].keyTakeaway}</p>
                              </div>
                              <div className="mt-10 flex justify-end">
                                  <button onClick={() => setActiveChapter(prev => prev + 1)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2">
                                      {activeChapter === courseData.chapters.length - 1 ? "Take Final Quiz" : "Next Chapter"} <ChevronRight size={18} />
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="animate-in slide-in-from-right-8 duration-500 h-full flex flex-col justify-center">
                              <div className="text-center mb-10">
                                  <div className="w-16 h-16 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6"><Zap size={32} /></div>
                                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Knowledge Check</h2>
                                  <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">{courseData.finalQuiz.question}</p>
                              </div>
                              <div className="flex flex-col gap-3 mb-10 max-w-lg mx-auto w-full">
                                  {courseData.finalQuiz.options.map((opt: string, idx: number) => (
                                      <button 
                                          key={idx} onClick={() => quizStatus === 'idle' && setSelectedAnswer(idx)} disabled={quizStatus !== 'idle'}
                                          className={cn("p-5 rounded-xl border-2 text-left font-bold transition-all text-sm md:text-base", 
                                              selectedAnswer === idx ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300",
                                              (quizStatus === 'correct' || quizStatus === 'incorrect') && idx === courseData.finalQuiz.correctIndex ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "",
                                              quizStatus === 'incorrect' && selectedAnswer === idx ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" : ""
                                          )}
                                      >
                                          {opt}
                                      </button>
                                  ))}
                              </div>
                              {quizStatus === 'idle' && selectedAnswer !== null && <button onClick={handleQuizSubmit} className="w-full max-w-lg mx-auto bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg hover:-translate-y-1">Submit Answer</button>}
                              {quizStatus === 'correct' && (
                                  <div className="text-center animate-in zoom-in-95 bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                                      <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2"><CheckCircle2 size={24} /> <span className="font-black uppercase tracking-widest">Correct! (+100 XP)</span></div>
                                      <p className="text-emerald-900 dark:text-emerald-100 font-medium text-sm">{courseData.finalQuiz.explanation}</p>
                                  </div>
                              )}
                              {quizStatus === 'incorrect' && (
                                  <div className="text-center animate-in zoom-in-95 bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-800">
                                      <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-2"><AlertTriangle size={24} /> <span className="font-black uppercase tracking-widest">Incorrect</span></div>
                                      <p className="text-red-900 dark:text-red-100 font-medium text-sm mb-4">The correct answer was option {courseData.finalQuiz.correctIndex + 1}.</p>
                                      <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">{courseData.finalQuiz.explanation}</p>
                                      <button onClick={() => {setQuizStatus('idle'); setSelectedAnswer(null)}} className="mt-6 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white underline underline-offset-4">Try Again</button>
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