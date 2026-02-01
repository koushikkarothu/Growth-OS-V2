'use client'

import { useState } from 'react'
import { Sparkles, BookOpen, MessageCircle, Save, HelpCircle, ArrowRight, Loader2, GraduationCap } from 'lucide-react'
import CreateNoteModal from '@/components/CreateNoteModal'

export default function LearnPage() {
  const [loading, setLoading] = useState(false)
  const [domain, setDomain] = useState('General Knowledge')
  const [concept, setConcept] = useState<any>(null)
  const [deepDiveAnswer, setDeepDiveAnswer] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [showDeepDive, setShowDeepDive] = useState(false)
  const [userQuestion, setUserQuestion] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)

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
      <CreateNoteModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onNoteAdded={() => alert('Saved to Vault!')} initialData={concept ? { topic: domain, concept: concept.topic, details: `${concept.content}\n\nWhy it matters: ${concept.importance}` } : null} />

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2"><Sparkles className="text-amber-500 fill-amber-500" /> Daily Knowledge Download</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Expand your horizons, one concept at a time.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-10">
        <div className="relative">
           <select className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-6 py-3.5 pr-12 outline-none focus:border-indigo-500 font-bold shadow-sm cursor-pointer" value={domain} onChange={(e) => setDomain(e.target.value)}>
             <option>General Knowledge</option><option>Computer Science</option><option>Business & Finance</option><option>Psychology</option><option>History</option><option>Quantum Physics</option>
           </select>
           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
        </div>
        <button onClick={generateConcept} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70">
          {loading ? <Loader2 className="animate-spin" /> : <BookOpen size={20} />} Teach Me Something
        </button>
      </div>

      {concept && !showQuiz && (
        <div className="animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
            
            <div className="flex justify-between items-start mb-6">
                <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Today's Topic</span>
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><GraduationCap size={20} /></div>
            </div>

            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-8 leading-tight">{concept.topic}</h2>
            
            <div className="space-y-8">
              <p className="text-xl font-medium text-slate-800 dark:text-slate-200 border-l-4 border-indigo-500 pl-6 italic leading-relaxed">"{concept.hook}"</p>
              <div className="prose prose-slate dark:prose-invert prose-lg max-w-none text-slate-600 dark:text-slate-300 leading-relaxed"><p>{concept.content}</p></div>
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Why this matters</h3>
                <p className="text-slate-700 dark:text-slate-300 font-medium">{concept.importance}</p>
              </div>
            </div>

            {deepDiveAnswer && (
              <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 p-6 rounded-2xl animate-in fade-in">
                <h4 className="text-indigo-700 dark:text-indigo-400 font-bold mb-2 flex items-center gap-2"><MessageCircle size={18} /> AI Clarification:</h4>
                <p className="text-indigo-900/80 dark:text-indigo-200 leading-relaxed">{deepDiveAnswer}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-all shadow-sm"><Save size={18} /> Save to Vault</button>
              <button onClick={() => setShowDeepDive(!showDeepDive)} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-all shadow-sm"><HelpCircle size={18} /> Ask Detail</button>
              <button onClick={startQuiz} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none ml-auto active:scale-95">Quiz Me <ArrowRight size={18} /></button>
            </div>

            {showDeepDive && (
              <div className="mt-6 flex gap-2 animate-in slide-in-from-top-2">
                <input type="text" placeholder="What specifically do you want to know more about?" className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" value={userQuestion} onChange={(e) => setUserQuestion(e.target.value)} />
                <button onClick={askDeepDive} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-bold transition-all">Ask</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showQuiz && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in duration-300 mt-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Check</h2>
            <button onClick={() => setShowQuiz(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm">Exit Quiz</button>
          </div>
          {quizQuestions.map((q, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{idx + 1}. {q.q}</h3>
              <div className="space-y-3">
                {q.options.map((opt: string, i: number) => (
                  <button key={i} onClick={(e) => { const btn = e.currentTarget; if (i === q.correct) { btn.className = "w-full text-left p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold transition-all shadow-sm"; btn.innerText = opt + " ✅ Correct!"; } else { btn.className = "w-full text-left p-4 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-all"; btn.innerText = opt + " ❌"; } }} className="w-full text-left p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 font-medium">{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}