'use client'

import { useState } from 'react'
import { Sparkles, BookOpen, MessageCircle, Save, HelpCircle, ArrowRight, Loader2, GraduationCap } from 'lucide-react'
import CreateNoteModal from '@/components/CreateNoteModal'
import { cn } from '@/lib/utils'

export default function LearnPage() {
  const [loading, setLoading] = useState(false)
  const [domain, setDomain] = useState('General Knowledge')
  
  // Content States
  const [concept, setConcept] = useState<any>(null)
  const [deepDiveAnswer, setDeepDiveAnswer] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  
  // Interaction States
  const [showDeepDive, setShowDeepDive] = useState(false)
  const [userQuestion, setUserQuestion] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)

  // API Calls (Same logic, cleaner UI)
  async function generateConcept() {
    setLoading(true); setConcept(null); setDeepDiveAnswer(''); setQuizQuestions([]); setShowQuiz(false); setShowDeepDive(false)
    try {
      const res = await fetch('/api/ai-learning', { method: 'POST', body: JSON.stringify({ action: 'generate', domain }) })
      const data = await res.json()
      setConcept(data)
    } catch (e) { alert('Failed to teach you. Try again!') } finally { setLoading(false) }
  }

  async function askDeepDive() {
    if (!userQuestion) return; setLoading(true)
    try {
      const res = await fetch('/api/ai-learning', { method: 'POST', body: JSON.stringify({ action: 'explain_more', currentConcept: concept, userQuestion }) })
      const data = await res.json(); setDeepDiveAnswer(data.answer)
    } catch (e) { alert('AI got confused.') } finally { setLoading(false) }
  }

  async function startQuiz() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-learning', { method: 'POST', body: JSON.stringify({ action: 'quiz', currentConcept: concept }) })
      const data = await res.json(); setQuizQuestions(data); setShowQuiz(true)
    } catch (e) { alert('Quiz generation failed.') } finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      
      <CreateNoteModal 
        isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onNoteAdded={() => alert('Saved to Vault!')}
        initialData={concept ? { topic: domain, concept: concept.topic, details: `${concept.content}\n\nWhy it matters: ${concept.importance}` } : null}
      />

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
          <Sparkles className="text-amber-500 fill-amber-500" />
          Daily Knowledge Download
        </h1>
        <p className="text-slate-500 font-medium">Expand your horizons, one concept at a time.</p>
      </header>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-10">
        <div className="relative">
           <select 
             className="appearance-none bg-white border border-slate-200 text-slate-900 rounded-xl px-6 py-3.5 pr-12 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold shadow-sm cursor-pointer"
             value={domain} onChange={(e) => setDomain(e.target.value)}
           >
             <option>General Knowledge</option><option>Computer Science</option><option>Business & Finance</option>
             <option>Psychology</option><option>History</option><option>Quantum Physics</option>
           </select>
           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
        </div>
        
        <button 
          onClick={generateConcept} disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin" /> : <BookOpen size={20} />}
          Teach Me Something
        </button>
      </div>

      {/* CONCEPT CARD */}
      {concept && !showQuiz && (
        <div className="animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-indigo-500 to-purple-500" />
            
            <div className="flex justify-between items-start mb-6">
                <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Today's Topic</span>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <GraduationCap size={20} />
                </div>
            </div>

            <h2 className="text-4xl font-extrabold text-slate-900 mb-8 leading-tight">{concept.topic}</h2>
            
            <div className="space-y-8">
              <p className="text-xl font-medium text-slate-800 border-l-4 border-indigo-500 pl-6 italic leading-relaxed">
                "{concept.hook}"
              </p>
              <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed">
                <p>{concept.content}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Why this matters</h3>
                <p className="text-slate-700 font-medium">{concept.importance}</p>
              </div>
            </div>

            {/* DEEP DIVE ANSWER */}
            {deepDiveAnswer && (
              <div className="mt-8 bg-indigo-50 border border-indigo-100 p-6 rounded-2xl animate-in fade-in">
                <h4 className="text-indigo-700 font-bold mb-2 flex items-center gap-2"><MessageCircle size={18} /> AI Clarification:</h4>
                <p className="text-indigo-900/80 leading-relaxed">{deepDiveAnswer}</p>
              </div>
            )}

            {/* ACTION BAR */}
            <div className="flex flex-wrap gap-3 mt-10 pt-10 border-t border-slate-100">
              <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 rounded-xl font-bold transition-all shadow-sm">
                <Save size={18} /> Save to Vault
              </button>

              <button onClick={() => setShowDeepDive(!showDeepDive)} className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 rounded-xl font-bold transition-all shadow-sm">
                <HelpCircle size={18} /> Ask Detail
              </button>

              <button onClick={startQuiz} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 ml-auto active:scale-95">
                Quiz Me <ArrowRight size={18} />
              </button>
            </div>

            {/* DEEP DIVE INPUT */}
            {showDeepDive && (
              <div className="mt-6 flex gap-2 animate-in slide-in-from-top-2">
                <input 
                  type="text" 
                  placeholder="What specifically do you want to know more about?"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  value={userQuestion} onChange={(e) => setUserQuestion(e.target.value)}
                />
                <button onClick={askDeepDive} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-bold transition-all">Ask</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUIZ MODE */}
      {showQuiz && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in duration-300 mt-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-900">Quick Check</h2>
            <button onClick={() => setShowQuiz(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">Exit Quiz</button>
          </div>
          
          {quizQuestions.map((q, idx) => (
            <div key={idx} className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">{idx + 1}. {q.q}</h3>
              <div className="space-y-3">
                {q.options.map((opt: string, i: number) => (
                  <button 
                    key={i}
                    onClick={(e) => {
                      const btn = e.currentTarget;
                      if (i === q.correct) {
                        btn.className = "w-full text-left p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 font-bold transition-all shadow-sm";
                        btn.innerText = opt + " ✅ Correct!";
                      } else {
                        btn.className = "w-full text-left p-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 font-medium transition-all";
                        btn.innerText = opt + " ❌";
                      }
                    }}
                    className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all text-slate-600 font-medium"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}