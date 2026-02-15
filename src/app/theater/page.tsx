'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import YouTube from 'react-youtube'
import { PlaySquare, DownloadCloud, CheckCircle2, Loader2, Sparkles, Trophy, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TheaterPage() {
  const [urlInput, setUrlInput] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)
  
  const [loadingAi, setLoadingAi] = useState(false)
  const [flashcards, setFlashcards] = useState<any[]>([])

  // Extract Video ID from various YouTube URL formats
  function loadVideo() {
    if (!urlInput) return
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = urlInput.match(regExp)
    if (match && match[2].length === 11) {
      setVideoId(match[2])
      setCompleted(false)
      setProgress(0)
      setFlashcards([])
    } else {
      alert("Invalid YouTube URL")
    }
  }

  // Track video state
  const onStateChange = (event: any) => {
    // 1 = Playing, 0 = Ended
    if (event.data === 1) setIsPlaying(true)
    else setIsPlaying(false)

    if (event.data === 0 && !completed) {
      setCompleted(true)
      setProgress(100)
      awardXP()
    }
  }

  // The Player fires this constantly while playing
  const onStateReady = (event: any) => {
    setInterval(() => {
        if (event.target.getPlayerState() === 1) {
            const current = event.target.getCurrentTime()
            const total = event.target.getDuration()
            setProgress(Math.min((current / total) * 100, 100))
        }
    }, 1000)
  }

  async function awardXP() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Add XP to a general or learning skill (We assume skill ID 1 is a general tracker, or we just log it)
    // For now, we will just show the UI success. In a full build, you'd trigger your updateSkillXP logic here.
    alert("🎉 Video Completed! +50 XP Earned.")
  }

  async function extractKnowledge() {
    if (!urlInput) return
    setLoadingAi(true)
    try {
      const res = await fetch('/api/theater', {
        method: 'POST',
        body: JSON.stringify({ url: urlInput })
      })
      const data = await res.json()
      if (data.flashcards) setFlashcards(data.flashcards)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAi(false)
    }
  }

  async function saveToVault(card: any, index: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('knowledge').insert([{
      user_id: user.id,
      topic: card.topic,
      concept: card.concept,
      details: card.details
    }])

    // Remove from UI once saved
    setFlashcards(cards => cards.filter((_, i) => i !== index))
    alert("Saved to Knowledge Vault!")
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 flex items-center gap-3">
          <PlaySquare className="text-red-500 fill-red-500/20" size={32} /> Neural Link Theater
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Watch. Execute. Extract.</p>
      </header>

      {/* URL INPUT */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 mb-8 shadow-sm flex flex-col md:flex-row gap-3">
        <input 
          type="text" 
          placeholder="Paste YouTube URL here..."
          className="flex-1 bg-transparent px-5 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none font-medium"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
        />
        <button 
          onClick={loadVideo}
          className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold transition-all"
        >
          Load Stream
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* THE PLAYER (Takes up 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 aspect-video relative">
            {!videoId ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                <PlaySquare size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Waiting for video stream...</p>
              </div>
            ) : (
              <YouTube 
                videoId={videoId} 
                opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }} 
                onStateChange={onStateChange}
                onReady={onStateReady}
                className="absolute inset-0 w-full h-full"
              />
            )}
          </div>

          {/* PROGRESS BAR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", completed ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : (isPlaying ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 animate-pulse" : "bg-slate-100 dark:bg-slate-800 text-slate-400"))}>
              {completed ? <Trophy size={24} /> : <PlaySquare size={24} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <span>Course Progress</span>
                <span className={completed ? "text-emerald-500" : ""}>{Math.round(progress)}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* KNOWLEDGE EXTRACTION (Right Column) */}
        <div className="space-y-6">
          <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2" />
             <h3 className="font-bold text-xl mb-2 relative z-10">AI Extraction</h3>
             <p className="text-indigo-200 text-sm mb-8 relative z-10 leading-relaxed">Let the AI scan the video transcript and automatically generate active recall flashcards.</p>
             
             <button 
                onClick={extractKnowledge}
                disabled={loadingAi || !videoId}
                className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 relative z-10 active:scale-95"
             >
                {loadingAi ? <Loader2 className="animate-spin" size={20} /> : <DownloadCloud size={20} />} 
                {loadingAi ? 'Scanning Neural Net...' : 'Extract Knowledge'}
             </button>
          </div>

          {/* GENERATED CARDS */}
          {flashcards.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" /> Discovered Concepts
              </h4>
              {flashcards.map((card, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md uppercase tracking-wider mb-3 inline-block">
                    {card.topic}
                  </span>
                  <h5 className="font-bold text-slate-900 dark:text-white mb-2 leading-tight">{card.concept}</h5>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-3">{card.details}</p>
                  <button 
                    onClick={() => saveToVault(card, idx)}
                    className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Add to Vault
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}