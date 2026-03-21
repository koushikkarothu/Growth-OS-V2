'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import dynamic from 'next/dynamic'
import { PlaySquare, Plus, ArrowLeft, Trash2, CheckCircle2, Film, Link as LinkIcon, X, Bot, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

// Initialize the Rich Text Editor (Server-Side Rendering disabled)
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

interface Playlist { id: number; title: string; description: string }
interface Video { id: number; playlist_id: number; youtube_id: string; title: string; is_watched: boolean; notes: string }

export default function TheaterPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  
  // Theater Mode State
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null)
  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Forms
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false)
  const [newPlTitle, setNewPlTitle] = useState('')
  const [newPlDesc, setNewPlDesc] = useState('')
  const [newVidUrl, setNewVidUrl] = useState('')
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)

  // Quick Vocab Capture State
  const [showVocabModal, setShowVocabModal] = useState(false)
  const [vocabLang, setVocabLang] = useState<'en' | 'de'>('en')
  const [vWord, setVWord] = useState(''); const [vTrans, setVTrans] = useState('')
  const [vType, setVType] = useState('Noun'); const [vGender, setVGender] = useState('der')
  const [vPlural, setVPlural] = useState(''); const [vConj, setVConj] = useState('')
  const [isSavingVocab, setIsSavingVocab] = useState(false)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { fetchPlaylists() }, [])
  useEffect(() => { if (activePlaylist) fetchVideos(activePlaylist.id) }, [activePlaylist])

  // --- DATABASE OPERATIONS ---
  async function fetchPlaylists() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('learning_playlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setPlaylists(data)
  }

  async function fetchVideos(playlistId: number) {
    const { data } = await supabase.from('learning_videos').select('*').eq('playlist_id', playlistId).order('created_at', { ascending: true })
    if (data) setVideos(data)
  }

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('learning_playlists').insert([{ user_id: user?.id, title: newPlTitle, description: newPlDesc }])
    setIsAddingPlaylist(false); setNewPlTitle(''); setNewPlDesc('');
    fetchPlaylists()
  }

  async function deletePlaylist(id: number) {
    if(!confirm("Delete this entire curriculum?")) return
    await supabase.from('learning_playlists').delete().eq('id', id)
    setActivePlaylist(null); fetchPlaylists()
  }

  // --- YOUTUBE IMPORTER ENGINE ---
  async function processYouTubeUrl(e: React.FormEvent) {
    e.preventDefault()
    setIsProcessingUrl(true)
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newVidUrl })
      })
      const data = await res.json()
      
      if (res.ok && data.videos && data.videos.length > 0) {
          if (data.warning) alert(data.warning); 
          
          const insertData = data.videos.map((vid: any) => ({
              playlist_id: activePlaylist?.id,
              user_id: user?.id,
              youtube_id: vid.youtube_id,
              title: vid.title
          }))
          await supabase.from('learning_videos').insert(insertData)
      } else {
          alert(data.error || "Could not extract video. Please check the URL.")
      }
    } catch (err) { 
        alert("Network error. Failed to communicate with server.") 
    }

    setNewVidUrl(''); setIsProcessingUrl(false);
    if(activePlaylist) fetchVideos(activePlaylist.id)
  }

  // --- VIDEO ACTIONS ---
  async function toggleWatched(video: Video) {
    const newVal = !video.is_watched
    await supabase.from('learning_videos').update({ is_watched: newVal }).eq('id', video.id)
    setVideos(videos.map(v => v.id === video.id ? { ...v, is_watched: newVal } : v))
    if (playingVideo?.id === video.id) setPlayingVideo({ ...playingVideo, is_watched: newVal })
  }

  async function deleteVideo(id: number) {
    await supabase.from('learning_videos').delete().eq('id', id)
    if(activePlaylist) fetchVideos(activePlaylist.id)
  }

  // --- AUTO-SAVE NOTEPAD LOGIC ---
  const handleNotesChange = (text: string) => {
    setNotes(text)
    setSaveStatus('saving')
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (playingVideo) {
        await supabase.from('learning_videos').update({ notes: text }).eq('id', playingVideo.id)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
        
        setVideos(videos.map(v => v.id === playingVideo.id ? { ...v, notes: text } : v))
      }
    }, 1000)
  }

  // --- GEMINI EXTRACTOR LOGIC ---
  const executeGeminiExtraction = async () => {
    if (!playingVideo || isAnalyzing) return;
    setIsAnalyzing(true);
    
    const loadingMessage = "\n\n> 🤖 *Gemini is analyzing the video transcript...*\n";
    setNotes(prev => prev + loadingMessage);

    try {
        const res = await fetch('/api/analyze-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: playingVideo.youtube_id })
        });
        
        const data = await res.json();
        
        if (res.ok && data.analysis) {
            const cleanedNotes = notes.replace(loadingMessage, '');
            const newNotes = cleanedNotes + (cleanedNotes ? '\n\n' : '') + "### 🤖 AI Analysis\n" + data.analysis;
            handleNotesChange(newNotes);
        } else {
            setNotes(prev => prev.replace(loadingMessage, '\n\n> ⚠️ *Error: ' + (data.error || "Analysis failed") + '*\n'));
            alert(data.error || "Analysis failed.");
        }
    } catch (e) {
        setNotes(prev => prev.replace(loadingMessage, '\n\n> ⚠️ *Error: Failed to connect to AI server.*\n'));
    }
    
    setIsAnalyzing(false);
  }

  // --- QUICK VOCAB CAPTURE LOGIC ---
  async function saveQuickVocab(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingVocab(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (vocabLang === 'en') {
        await supabase.from('vocabulary').insert([{ user_id: user?.id, word: vWord, definition: vTrans }])
    } else {
        await supabase.from('german_vocabulary').insert([{
            user_id: user?.id, word: vWord, translation: vTrans, word_type: vType,
            gender: vType === 'Noun' ? vGender : null, plural_form: vPlural, conjugation: vConj
        }])
    }
    
    setIsSavingVocab(false); setShowVocabModal(false);
    setVWord(''); setVTrans(''); setVPlural(''); setVConj('');
  }

  const openTheater = (video: Video) => {
      setPlayingVideo(video)
      setNotes(video.notes || '')
  }

  // ============================================================================
  // VIEW 1: PLAYLIST DASHBOARD
  // ============================================================================
  if (!activePlaylist) {
    return (
      <div className="max-w-6xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Film className="text-indigo-500" size={36} /> Learning Theater
            </h1>
            <p className="text-slate-500 font-medium mt-2">Your distraction-free knowledge database.</p>
          </div>
          <button onClick={() => setIsAddingPlaylist(!isAddingPlaylist)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
            <Plus size={20} /> New Curriculum
          </button>
        </header>

        {isAddingPlaylist && (
          <form onSubmit={createPlaylist} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-10 flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-4">
            <input type="text" placeholder="Curriculum Title (e.g. German B1)" value={newPlTitle} onChange={e => setNewPlTitle(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white" required />
            <input type="text" placeholder="Description..." value={newPlDesc} onChange={e => setNewPlDesc(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white" />
            <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold">Create</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map(pl => (
            <div key={pl.id} onClick={() => setActivePlaylist(pl)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PlaySquare size={24} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{pl.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-2">{pl.description || "No description provided."}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ============================================================================
  // VIEW 2: INSIDE A PLAYLIST
  // ============================================================================
  const watchedCount = videos.filter(v => v.is_watched).length
  const progress = videos.length === 0 ? 0 : Math.round((watchedCount / videos.length) * 100)

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in px-4 md:px-8">
      <button onClick={() => setActivePlaylist(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Theater
      </button>

      {/* Playlist Header */}
      <header className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3">{activePlaylist.title}</h1>
          <p className="text-slate-500 font-medium">{activePlaylist.description}</p>
          
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 max-w-xs h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-400">{progress}% Complete ({watchedCount}/{videos.length})</span>
          </div>
        </div>
        <button onClick={() => deletePlaylist(activePlaylist.id)} className="text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 p-3 rounded-xl transition-colors">
          <Trash2 size={20} />
        </button>
      </header>

      {/* Add Single Video OR Full Playlist */}
      <form onSubmit={processYouTubeUrl} className="flex flex-col md:flex-row gap-3 mb-10 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex-1 relative">
          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="url" placeholder="Paste YouTube Video OR Playlist Link here..." 
            value={newVidUrl} onChange={e => setNewVidUrl(e.target.value)} 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white" required 
          />
        </div>
        <button type="submit" disabled={isProcessingUrl} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-md disabled:opacity-50 min-w-[160px]">
          {isProcessingUrl ? 'Importing...' : 'Add to Curriculum'}
        </button>
      </form>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <div key={video.id} className={cn(
            "bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden transition-all group",
            video.is_watched ? "border-emerald-200 dark:border-emerald-900/50 opacity-70" : "border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-indigo-300"
          )}>
            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer" onClick={() => openTheater(video)}>
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md z-10 backdrop-blur-sm">
                 Module {index + 1}
              </div>
              <img 
                src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`} 
                alt="Thumbnail" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-all">
                 <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-indigo-600 shadow-xl scale-90 group-hover:scale-110 transition-transform">
                    <PlaySquare size={24} className="ml-1" />
                 </div>
              </div>
            </div>

            <div className="p-5">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-4 leading-tight">
                {video.title}
              </h4>
              <div className="flex items-center justify-between">
                <button onClick={() => toggleWatched(video)} className={cn("text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors", video.is_watched ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700")}>
                  <CheckCircle2 size={14} /> {video.is_watched ? 'Watched' : 'Mark Watched'}
                </button>
                <button onClick={() => deleteVideo(video.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================================
          🎬 THEATER 2.0 (SPLIT SCREEN DOJO)
          ============================================================================ */}
      {playingVideo && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300 overflow-hidden">
          
          {/* TOP NAVBAR */}
          <div className="h-16 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-4">
               <button onClick={() => setPlayingVideo(null)} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl">
                 <X size={20} /> <span className="hidden md:inline">Close</span>
               </button>
               <h3 className="text-slate-200 font-bold truncate max-w-xs lg:max-w-xl text-sm border-l border-slate-700 pl-4">{playingVideo.title}</h3>
            </div>
            
            <div className="flex items-center gap-3">
                {/* QUICK ADD VOCAB BUTTON */}
                <button onClick={() => setShowVocabModal(true)} className="px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all">
                    <Plus size={16} /> <span className="hidden md:inline">Quick Vocab</span>
                </button>
                
                <button onClick={() => toggleWatched(playingVideo)} className={cn("px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all", playingVideo.is_watched ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700")}>
                  <CheckCircle2 size={18} /> <span className="hidden md:inline">{playingVideo.is_watched ? 'Watched' : 'Mark Watched'}</span>
                </button>
            </div>
          </div>

          {/* SPLIT LAYOUT */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            
            {/* LEFT: Video Player */}
            <div className="flex-[7] bg-black p-0 lg:p-6 flex items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-800 min-h-[30vh] lg:min-h-0">
               <div className="w-full h-full lg:rounded-2xl overflow-hidden shadow-2xl relative">
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${playingVideo.youtube_id}?autoplay=1&rel=0&modestbranding=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0"></iframe>
               </div>
            </div>

            {/* RIGHT: Intelligent Notepad & AI */}
            <div className="flex-[3] bg-slate-950 flex flex-col h-full relative">
               <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <div className="flex items-center gap-2">
                     <span className="font-bold text-slate-200 text-sm">Deep Focus Notes</span>
                     {saveStatus === 'saving' && <span className="text-[10px] text-slate-500 uppercase tracking-wider animate-pulse">Saving...</span>}
                     {saveStatus === 'saved' && <span className="text-[10px] text-emerald-500 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10} /> Saved</span>}
                  </div>
                  
                  {/* GEMINI BUTTON */}
                  <button 
                      onClick={executeGeminiExtraction} 
                      disabled={isAnalyzing}
                      className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all group",
                          isAnalyzing ? "bg-indigo-600/50 text-indigo-300 cursor-not-allowed" : "bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30"
                      )}
                  >
                      <Bot size={14} className={isAnalyzing ? "animate-pulse" : ""} />
                      <span className="hidden xl:inline">{isAnalyzing ? "Analyzing Transcript..." : "Extract with Gemini"}</span>
                  </button>
               </div>
               
               {/* RICH TEXT EDITOR */}
               <div className="flex-1 p-0 relative bg-slate-950 overflow-hidden" data-color-mode="dark">
                 <MDEditor 
                    value={notes}
                    onChange={(val) => handleNotesChange(val || '')}
                    preview="live"
                    className="w-full h-full border-0 !bg-transparent"
                    height="100%"
                    textareaProps={{
                       placeholder: "Commander, log critical concepts here. Use the toolbar for bold, lists, and tables..."
                    }}
                 />
               </div>
            </div>
          </div>

          {/* ============================================================================
              ⚡ QUICK VOCAB CAPTURE MODAL ⚡
              ============================================================================ */}
          {showVocabModal && (
              <div className="absolute inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
                      <button onClick={() => setShowVocabModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                      
                      <h3 className="text-xl font-black text-white mb-4">Log New Word</h3>
                      
                      {/* Language Toggle */}
                      <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
                          <button onClick={() => setVocabLang('en')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", vocabLang === 'en' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}>🇬🇧 English</button>
                          <button onClick={() => setVocabLang('de')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", vocabLang === 'de' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white")}>🇩🇪 Deutsch</button>
                      </div>

                      <form onSubmit={saveQuickVocab} className="space-y-4">
                          {vocabLang === 'de' && (
                              <div className="grid grid-cols-2 gap-3">
                                  <select value={vType} onChange={e => setVType(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none">
                                      <option>Noun</option><option>Verb</option><option>Adjective</option>
                                  </select>
                                  {vType === 'Noun' && (
                                      <select value={vGender} onChange={e => setVGender(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none">
                                          <option value="der">der (M)</option><option value="die">die (F)</option><option value="das">das (N)</option>
                                      </select>
                                  )}
                              </div>
                          )}

                          <input type="text" placeholder={vocabLang === 'en' ? "Word / Phrase" : "German Word"} value={vWord} onChange={e => setVWord(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                          <input type="text" placeholder={vocabLang === 'en' ? "Definition" : "English Translation"} value={vTrans} onChange={e => setVTrans(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />

                          {vocabLang === 'de' && vType === 'Noun' && (
                              <input type="text" placeholder="Plural (e.g. die Häuser)" value={vPlural} onChange={e => setVPlural(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500" />
                          )}
                          {vocabLang === 'de' && vType === 'Verb' && (
                              <input type="text" placeholder="Conjugation Notes" value={vConj} onChange={e => setVConj(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500" />
                          )}

                          <button type="submit" disabled={isSavingVocab || !vWord || !vTrans} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-md transition-all">
                              {isSavingVocab ? "Logging..." : "Secure to Vault"}
                          </button>
                      </form>
                  </div>
              </div>
          )}

        </div>
      )}

    </div>
  )
}