'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Mic, Square, Sparkles, MessageSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: string
  parts: { text: string }[]
}

export default function CoachPage() {
  const [activeTab, setActiveTab] = useState<'Syntax' | 'Voice'>('Syntax')
  const [vocabList, setVocabList] = useState<any[]>([])
  const [selectedWord, setSelectedWord] = useState<any>(null)
  const [sentenceInput, setSentenceInput] = useState('')
  const [syntaxResult, setSyntaxResult] = useState<any>(null)
  const [syntaxLoading, setSyntaxLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    fetchVocab()
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false; recognition.lang = 'en-US'; recognition.interimResults = false;
        recognition.onstart = () => cancelAudio()
        recognition.onresult = (event: any) => { const text = event.results[0][0].transcript; setTranscript(text); handleVoiceSend(text) }
        recognition.onend = () => setIsRecording(false)
        recognitionRef.current = recognition
      }
    }
    return () => cancelAudio()
  }, [])

  function cancelAudio() { if (synthRef.current) synthRef.current.cancel() }
  async function fetchVocab() { const { data } = await supabase.from('knowledge').select('*').ilike('topic', '%vocab%'); if (data) setVocabList(data) }

  async function checkSyntax() {
    if (!sentenceInput || !selectedWord) return; setSyntaxLoading(true)
    try { const res = await fetch('/api/ai-coach', { method: 'POST', body: JSON.stringify({ mode: 'syntax_check', input: sentenceInput, context: selectedWord.concept }) }); const data = await res.json(); setSyntaxResult(data) } catch (e) { alert("AI busy.") } finally { setSyntaxLoading(false) }
  }

  function toggleRecording() { if (isRecording) { recognitionRef.current?.stop() } else { setIsRecording(true); recognitionRef.current?.start() } }

  async function handleVoiceSend(text: string) {
    if (!text.trim()) return
    const userMsg: Message = { role: 'user', parts: [{ text }] }; const updatedHistory = [...messages, userMsg]; setMessages(updatedHistory)
    try {
      const res = await fetch('/api/ai-coach', { method: 'POST', body: JSON.stringify({ mode: 'conversation', input: text, history: updatedHistory }) })
      if (res.status === 429) { alert("AI Cooling down..."); return }
      const data = await res.json()
      if (data.reply) { const aiMsg: Message = { role: 'model', parts: [{ text: data.reply }] }; setMessages(curr => [...curr, aiMsg]); cancelAudio(); const utterance = new SpeechSynthesisUtterance(data.reply); window.speechSynthesis.speak(utterance) }
    } catch (e) { console.error(e) }
  }

  async function endConversation() {
    cancelAudio(); const res = await fetch('/api/ai-coach', { method: 'POST', body: JSON.stringify({ mode: 'analyze_conversation', history: messages }) }); const data = await res.json(); setAnalysis(data)
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">AI Communication Coach</h1>
        <p className="text-slate-500 dark:text-slate-400">Master your words. Polish your speech.</p>
      </header>

      <div className="flex p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit mb-8 shadow-sm">
        <button onClick={() => { setActiveTab('Syntax'); cancelAudio(); }} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold flex gap-2", activeTab === 'Syntax' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>
          <Sparkles size={16} /> Syntax Lab
        </button>
        <button onClick={() => { setActiveTab('Voice'); cancelAudio(); }} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold flex gap-2", activeTab === 'Voice' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>
          <Mic size={16} /> Voice Dojo
        </button>
      </div>

      {activeTab === 'Syntax' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-[500px] overflow-y-auto">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Sparkles className="text-amber-500" size={18}/> Vocabulary Vault</h3>
            <div className="space-y-3">
              {vocabList.length === 0 && <div className="text-center py-10 text-slate-400">No words found.</div>}
              {vocabList.map(item => (
                <button key={item.id} onClick={() => { setSelectedWord(item); setSyntaxResult(null); setSentenceInput('') }} className={cn("w-full text-left p-4 rounded-xl border transition-all", selectedWord?.id === item.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800")}>
                  <div className="font-bold text-slate-800 dark:text-white">{item.concept}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{item.details}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Construct a Sentence</h3>
              {selectedWord ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Target Word</span>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{selectedWord.concept}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{selectedWord.details}</p>
                  </div>
                  <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 outline-none focus:border-indigo-500 transition-all dark:text-white" rows={4} placeholder={`Write a sentence...`} value={sentenceInput} onChange={(e) => setSentenceInput(e.target.value)} />
                  <button onClick={checkSyntax} disabled={syntaxLoading || !sentenceInput} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{syntaxLoading ? <Loader2 className="animate-spin" /> : 'Check Grammar'}</button>
                </div>
              ) : <div className="text-center py-20 text-slate-400">Select a word first.</div>}
            </div>
            {syntaxResult && (
              <div className={cn("rounded-3xl p-6 border animate-in slide-in-from-bottom-2", syntaxResult.correct ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30" : "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30")}>
                <div className="flex items-center gap-3 mb-3">
                  {syntaxResult.correct ? <CheckCircle2 className="text-emerald-600 dark:text-emerald-400"/> : <AlertCircle className="text-orange-600 dark:text-orange-400"/>}
                  <h4 className={cn("font-bold", syntaxResult.correct ? "text-emerald-800 dark:text-emerald-300" : "text-orange-800 dark:text-orange-300")}>{syntaxResult.correct ? "Excellent Usage!" : "Needs Improvement"}</h4>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-3">{syntaxResult.feedback}</p>
                {!syntaxResult.correct && syntaxResult.improved && (<div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl"><span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Better Version:</span><p className="font-medium text-slate-900 dark:text-white">{syntaxResult.improved}</p></div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Voice' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex-1 space-y-4 mb-6 overflow-y-auto max-h-[400px] p-2">
              {messages.length === 0 && <div className="text-center text-slate-400 mt-20">Tap the microphone to start talking.</div>}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] p-4 rounded-2xl text-sm", msg.role === 'user' ? "bg-indigo-600 text-white rounded-br-none" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none")}>{msg.parts[0].text}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
               <button onClick={toggleRecording} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg", isRecording ? "bg-red-500 text-white animate-pulse" : "bg-indigo-600 text-white hover:bg-indigo-700")}>{isRecording ? <Square fill="currentColor" /> : <Mic />}</button>
               <div className="flex-1 text-slate-400 text-sm italic">{isRecording ? "Listening..." : "Click mic to speak"}</div>
               {messages.length > 0 && <button onClick={endConversation} className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Analyze Session</button>}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><MessageSquare className="text-indigo-500"/> Report Card</h3>
            {!analysis ? <div className="text-center py-20 text-slate-400 text-sm">Have a conversation first.</div> : (
              <div className="space-y-6 animate-in zoom-in">
                 <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Grade</span>
                    <div className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">{analysis.score}</div>
                 </div>
                 <div><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1"><CheckCircle2 size={12}/> Strengths</span><ul className="text-sm text-slate-600 dark:text-slate-300 list-disc ml-4 mt-1">{analysis.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                 <div><span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1"><AlertCircle size={12}/> Improvements</span><ul className="text-sm text-slate-600 dark:text-slate-300 list-disc ml-4 mt-1">{analysis.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                 <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-sm text-indigo-900 dark:text-indigo-200"><strong>💡 Pro Tip:</strong> {analysis.tips}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}