'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import dynamic from 'next/dynamic'
import YouTube from 'react-youtube'
import { PlaySquare, Plus, ArrowLeft, Trash2, CheckCircle2, Film, Link as LinkIcon, X, Bot, Clock, Wand2, Library, Search, Table as TableIcon, GripVertical, ChevronDown, AlignLeft, LayoutPanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
// @ts-ignore
import 'react-quill-new/dist/quill.snow.css';
import { marked } from 'marked'; 

// Nuclear cast to bypass all Next.js SSR and TypeScript strict typing for the Quill wrapper
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false }) as any;

interface Playlist { id: number; title: string; description: string }
interface Video { id: number; playlist_id: number; youtube_id: string; title: string; is_watched: boolean; notes: string }

export default function TheaterPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null)
  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [ytPlayer, setYtPlayer] = useState<any>(null)
  
  const quillRef = useRef<any>(null)

  // 🎯 NEW: Resizable Pane State
  const [notesWidthPercent, setNotesWidthPercent] = useState(35) // Default to 35% width
  const [isDragging, setIsDragging] = useState(false)

  // 🎯 NEW: Table Toolkit State
  const [showTableMenu, setShowTableMenu] = useState(false)

  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false)
  const [newPlTitle, setNewPlTitle] = useState('')
  const [newPlDesc, setNewPlDesc] = useState('')
  const [newVidUrl, setNewVidUrl] = useState('')
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)

  const [showVocabModal, setShowVocabModal] = useState(false)
  const [vocabLang, setVocabLang] = useState<'en' | 'de'>('en')
  const [vWord, setVWord] = useState(''); const [vTrans, setVTrans] = useState('')
  const [vType, setVType] = useState('Noun'); const [vGender, setVGender] = useState('der')
  const [vPlural, setVPlural] = useState(''); const [vConj, setVConj] = useState('')
  const [isSavingVocab, setIsSavingVocab] = useState(false)
  const [isAutoFilling, setIsAutoFilling] = useState(false) 

  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false)
  const [globalNotes, setGlobalNotes] = useState<{title: string, notes: string}[]>([])
  const [noteSearch, setNoteSearch] = useState('')

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { fetchPlaylists() }, [])
  useEffect(() => { if (activePlaylist) fetchVideos(activePlaylist.id) }, [activePlaylist])

  // 🎯 DRAG RESIZE LISTENER EFFECT
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        // Calculate new percentage from the right side of the screen
        const newWidth = 100 - (e.clientX / window.innerWidth) * 100;
        if (newWidth > 20 && newWidth < 60) setNotesWidthPercent(newWidth);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const fetchGlobalNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('learning_videos').select('title, notes').eq('user_id', user.id).not('notes', 'is', null).neq('notes', '')
      if (data) setGlobalNotes(data)
  }

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

  async function processYouTubeUrl(e: React.FormEvent) {
    e.preventDefault()
    setIsProcessingUrl(true)
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const res = await fetch('/api/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: newVidUrl }) })
      const data = await res.json()
      if (res.ok && data.videos && data.videos.length > 0) {
          if (data.warning) alert(data.warning); 
          const insertData = data.videos.map((vid: any) => ({ playlist_id: activePlaylist?.id, user_id: user?.id, youtube_id: vid.youtube_id, title: vid.title }))
          await supabase.from('learning_videos').insert(insertData)
      } else alert(data.error || "Could not extract video.")
    } catch (err) { alert("Network error.") }
    setNewVidUrl(''); setIsProcessingUrl(false);
    if(activePlaylist) fetchVideos(activePlaylist.id)
  }

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

  const executeGeminiExtraction = async () => {
    if (!playingVideo || isAnalyzing) return;
    setIsAnalyzing(true);
    const loadingMessage = "<p><br>🤖 <em>Gemini is analyzing the video transcript...</em></p>";
    setNotes(prev => prev + loadingMessage);
    try {
        const res = await fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: playingVideo.youtube_id }) });
        const data = await res.json();
        if (res.ok && data.analysis) {
            const cleanedNotes = notes.replace(loadingMessage, '');
            let htmlAnalysis = data.analysis.replace(/```html/g, '').replace(/```/g, '').trim();
            const newNotes = cleanedNotes + "<br><hr><br><h3>🤖 AI Analysis</h3>" + htmlAnalysis;
            handleNotesChange(newNotes);
        } else {
            setNotes(prev => prev.replace(loadingMessage, `<p>⚠️ <em>Error: ${data.error || "Analysis failed"}</em></p>`));
        }
    } catch (e) { setNotes(prev => prev.replace(loadingMessage, '<p>⚠️ <em>Error: Failed to connect to AI server.</em></p>')); }
    setIsAnalyzing(false);
  }

  const insertTimestamp = async () => {
    if (ytPlayer) {
        const time = await ytPlayer.getCurrentTime();
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        const secs = Math.floor(time);
        const timeHtml = `&nbsp;<span class="timestamp-link" data-time="${secs}" style="color: #8b5cf6; font-weight: bold; cursor: pointer; text-decoration: underline;">▶ [${minutes}:${seconds}]</span>&nbsp;`;
        handleNotesChange(notes + timeHtml);
    }
  }

  // 🎯 NEW: LIVE TABLE ENGINE PROTOCOL
  const getTableModule = () => {
      if (quillRef.current) return quillRef.current.getEditor().getModule('table');
      return null;
  }

  const tableAction = (action: string) => {
      const table = getTableModule();
      if (!table) return alert("System Warning: Quill Table Module failed to initialize.");
      
      switch(action) {
          case 'insert': table.insertTable(2, 2); break;
          case 'row-above': table.insertRowAbove(); break;
          case 'row-below': table.insertRowBelow(); break;
          case 'col-left': table.insertColumnLeft(); break;
          case 'col-right': table.insertColumnRight(); break;
          case 'del-row': table.deleteRow(); break;
          case 'del-col': table.deleteColumn(); break;
          case 'del-table': table.deleteTable(); break;
      }
      setShowTableMenu(false);
  }

  const handleEditorClick = (e: any) => {
      const target = e.target.closest('[data-time]');
      if (target) {
          const time = target.getAttribute('data-time');
          if (time && ytPlayer) { ytPlayer.seekTo(parseInt(time)); ytPlayer.playVideo(); }
      }
  }

  async function autoFillQuickVocab() {
      if (!vWord.trim()) return alert("Type a word first to extract its data.")
      setIsAutoFilling(true)
      const customPrompt = vocabLang === 'de' 
        ? `Analyze the German word "${vWord}". Return ONLY a raw JSON object with these keys: "translation" (English meaning), "word_type" ("Noun", "Verb", "Adjective", "Adverb", "Preposition", "Other"), "gender" ("der", "die", "das", or null if not a noun), "plural" (plural form in German, or null), "conjugation" (brief conjugation notes like 'ich gehe, du gehst, er/sie/es geht, wir gehen, ihr geht, sie/Sie gehen' or null). No markdown.`
        : `Analyze the English word "${vWord}". Return ONLY a raw JSON object with this key: "translation" (a clear, concise dictionary definition). No markdown.`

      try {
          const res = await fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: "MOCK_ID_FOR_PROMPT", customPrompt }) })
          const data = await res.json()
          if (data.analysis) {
              const parsed = JSON.parse(data.analysis.replace(/```json/g, '').replace(/```/g, '').trim());
              if(parsed.translation) setVTrans(parsed.translation);
              if(vocabLang === 'de') {
                 if(parsed.word_type) setVType(parsed.word_type);
                 if(parsed.gender && parsed.word_type === 'Noun') setVGender(parsed.gender);
                 if(parsed.plural) setVPlural(parsed.plural);
                 if(parsed.conjugation) setVConj(parsed.conjugation);
              }
          }
      } catch (e) { alert("Auto-fill analysis failed.") }
      setIsAutoFilling(false)
  }

  async function saveQuickVocab(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingVocab(true)
    const { data: { user } } = await supabase.auth.getUser()
    const tableName = vocabLang === 'en' ? 'vocabulary' : 'german_vocabulary';
    const { data: existing } = await supabase.from(tableName).select('id').ilike('word', vWord.trim()).limit(1);
    if (existing && existing.length > 0) {
        alert(`Commander, "${vWord}" is already secured in your vault.`);
        setIsSavingVocab(false); return;
    }
    if (vocabLang === 'en') await supabase.from('vocabulary').insert([{ user_id: user?.id, word: vWord, definition: vTrans }])
    else await supabase.from('german_vocabulary').insert([{ user_id: user?.id, word: vWord, translation: vTrans, word_type: vType, gender: vType === 'Noun' ? vGender : null, plural_form: vPlural, conjugation: vConj }])
    setIsSavingVocab(false); setShowVocabModal(false);
    setVWord(''); setVTrans(''); setVPlural(''); setVConj('');
  }

  const openTheater = async (video: Video) => {
      let rawNotes = video.notes || '';
      if (rawNotes.includes('###') || rawNotes.includes('|---') || rawNotes.includes('**')) {
          const htmlNotes = await marked.parse(rawNotes);
          setNotes(htmlNotes);
          handleNotesChange(htmlNotes);
      } else {
          setNotes(rawNotes);
      }
      setPlayingVideo(video);
  }

  // 🎯 QUILL SETUP: ENABLE THE TABLE MODULE
  const modules = {
    table: true, // Enables Native Table Tools
    toolbar: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }, { 'align': [] }],
      ['link', 'clean']
    ],
  };

  if (!activePlaylist) {
    return (
      <div className="max-w-6xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8 relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div><h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3"><Film className="text-indigo-500" size={36} /> Learning Theater</h1><p className="text-slate-500 font-medium mt-2">Your distraction-free knowledge database.</p></div>
          <div className="flex gap-4">
              <button onClick={() => {fetchGlobalNotes(); setIsNotesDrawerOpen(true);}} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"><Library size={20} /> Global Notes</button>
              <button onClick={() => setIsAddingPlaylist(!isAddingPlaylist)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"><Plus size={20} /> New Curriculum</button>
          </div>
        </header>

        {isAddingPlaylist && (
          <form onSubmit={createPlaylist} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-10 flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-4">
            <input type="text" placeholder="Curriculum Title" value={newPlTitle} onChange={e => setNewPlTitle(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white" required />
            <input type="text" placeholder="Description..." value={newPlDesc} onChange={e => setNewPlDesc(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none dark:text-white" />
            <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold">Create</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map(pl => (
            <div key={pl.id} onClick={() => setActivePlaylist(pl)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><PlaySquare size={24} className="text-indigo-600 dark:text-indigo-400" /></div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{pl.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-2">{pl.description || "No description provided."}</p>
            </div>
          ))}
        </div>
        {isNotesDrawerOpen && <NotesDrawer notes={globalNotes} onClose={() => setIsNotesDrawerOpen(false)} search={noteSearch} setSearch={setNoteSearch} />}
      </div>
    )
  }

  const watchedCount = videos.filter(v => v.is_watched).length
  const progress = videos.length === 0 ? 0 : Math.round((watchedCount / videos.length) * 100)

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in px-4 md:px-8 relative">
      
      {/* 🎯 GLOBAL QUILL STYLES (Enforces Native Tables) */}
      <style dangerouslySetInnerHTML={{__html: `
        .quill-editor-container { height: calc(100% - 42px); }
        .dark .ql-toolbar { background-color: #0f172a; border-color: #1e293b !important; }
        .dark .ql-container { border-color: #1e293b !important; font-family: inherit; font-size: 1rem; color: #f8fafc; }
        .dark .ql-stroke { stroke: #cbd5e1 !important; }
        .dark .ql-fill { fill: #cbd5e1 !important; }
        .dark .ql-picker { color: #cbd5e1 !important; }
        .dark .ql-editor.ql-blank::before { color: #64748b; font-style: normal; }
        .ql-editor { padding: 2rem; line-height: 1.7; }
        .ql-editor h1, .ql-editor h2, .ql-editor h3 { font-weight: 900; margin-bottom: 1rem; }
        .ql-editor table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; background-color: rgba(255,255,255,0.02); border-radius: 8px; overflow: hidden; }
        .ql-editor th, .ql-editor td { border: 1px solid rgba(148, 163, 184, 0.2); padding: 0.75rem; text-align: left; }
        .ql-editor th { font-weight: 900; background-color: rgba(99, 102, 241, 0.1); color: inherit; }
        .ql-editor blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; color: #94a3b8; font-style: italic; }
      `}} />

      <button onClick={() => setActivePlaylist(null)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors"><ArrowLeft size={16} /> Back to Theater</button>

      <header className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3">{activePlaylist.title}</h1>
          <p className="text-slate-500 font-medium">{activePlaylist.description}</p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 max-w-xs h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
            <span className="text-xs font-bold text-slate-400">{progress}% Complete ({watchedCount}/{videos.length})</span>
          </div>
        </div>
        <button onClick={() => deletePlaylist(activePlaylist.id)} className="text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 p-3 rounded-xl transition-colors"><Trash2 size={20} /></button>
      </header>

      <form onSubmit={processYouTubeUrl} className="flex flex-col md:flex-row gap-3 mb-10 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex-1 relative">
          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="url" placeholder="Paste YouTube Video OR Playlist Link here..." value={newVidUrl} onChange={e => setNewVidUrl(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white" required />
        </div>
        <button type="submit" disabled={isProcessingUrl} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-md disabled:opacity-50 min-w-[160px]">{isProcessingUrl ? 'Importing...' : 'Add to Curriculum'}</button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <div key={video.id} className={cn("bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden transition-all group", video.is_watched ? "border-emerald-200 opacity-70" : "border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-indigo-300")}>
            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer" onClick={() => openTheater(video)}>
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md z-10 backdrop-blur-sm">Module {index + 1}</div>
              <img src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-all"><div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center text-indigo-600 shadow-xl scale-90 group-hover:scale-110 transition-transform"><PlaySquare size={24} className="ml-1" /></div></div>
            </div>
            <div className="p-5">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-4 leading-tight">{video.title}</h4>
              <div className="flex items-center justify-between">
                <button onClick={() => toggleWatched(video)} className={cn("text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2", video.is_watched ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}><CheckCircle2 size={14} /> {video.is_watched ? 'Watched' : 'Mark Watched'}</button>
                <button onClick={() => deleteVideo(video.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🎯 THE ULTIMATE THEATER VIEW (RESIZABLE) */}
      {playingVideo && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300 overflow-hidden"
             style={{ userSelect: isDragging ? 'none' : 'auto' }}>
          
          <div className="h-16 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-4">
               <button onClick={() => {setPlayingVideo(null); setYtPlayer(null);}} className="flex items-center gap-2 text-slate-300 hover:text-white font-bold px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"><X size={20} /> <span className="hidden md:inline">Close Studio</span></button>
               <h3 className="text-slate-200 font-bold truncate max-w-xs lg:max-w-xl text-sm border-l border-slate-700 pl-4">{playingVideo.title}</h3>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => {fetchGlobalNotes(); setIsNotesDrawerOpen(true);}} className="px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"><Library size={16} /> <span className="hidden md:inline">Global Notes</span></button>
                <button onClick={() => setShowVocabModal(true)} className="px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30"><Plus size={16} /> <span className="hidden md:inline">Quick Vocab</span></button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
            
            {/* VIDEO PANE */}
            <div className="bg-black flex items-center justify-center relative" style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${100 - notesWidthPercent}%` : '100%' }}>
               <div className="w-full h-full relative">
                  <YouTube videoId={playingVideo.youtube_id} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, modestbranding: 1, rel: 0 } }} onReady={(e) => setYtPlayer(e.target)} className="absolute inset-0 w-full h-full" iframeClassName="w-full h-full" />
               </div>
            </div>

            {/* 🎯 THE RESIZER HANDLE (Desktop Only) */}
            <div 
               onMouseDown={() => setIsDragging(true)}
               className={cn("hidden lg:flex w-2 bg-slate-900 border-l border-r border-slate-800 hover:bg-indigo-600 cursor-col-resize items-center justify-center transition-colors z-50", isDragging ? "bg-indigo-500" : "")}
            >
                <div className="h-12 flex flex-col justify-center gap-1 opacity-50"><div className="w-0.5 h-1 bg-white rounded-full"/><div className="w-0.5 h-1 bg-white rounded-full"/><div className="w-0.5 h-1 bg-white rounded-full"/></div>
            </div>

            {/* NOTES PANE */}
            <div className="bg-white dark:bg-[#0f172a] flex flex-col h-full relative" style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${notesWidthPercent}%` : '100%' }}>
               
               <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                     <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">Deep Focus</span>
                     {saveStatus === 'saving' && <span className="text-[10px] text-slate-500 uppercase tracking-wider animate-pulse">Saving...</span>}
                     {saveStatus === 'saved' && <span className="text-[10px] text-emerald-500 uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10} /> Saved</span>}
                  </div>
                  
                  {/* 🎯 UPGRADED ACTION BAR WITH LIVE TABLE TOOLKIT */}
                  <div className="flex gap-2 relative">
                      
                      <div className="relative">
                          <button onClick={() => setShowTableMenu(!showTableMenu)} title="Table Toolkit" className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-500 transition-all"><TableIcon size={16} /></button>
                          
                          {showTableMenu && (
                              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-[200] animate-in zoom-in-95">
                                  <div className="px-3 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">Table Toolkit</div>
                                  <button onClick={() => tableAction('insert')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600">Insert 2x2 Table</button>
                                  <button onClick={() => tableAction('row-above')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">+ Row Above</button>
                                  <button onClick={() => tableAction('row-below')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">+ Row Below</button>
                                  <button onClick={() => tableAction('col-left')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">+ Col Left</button>
                                  <button onClick={() => tableAction('col-right')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">+ Col Right</button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                  <button onClick={() => tableAction('del-row')} className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">- Delete Row</button>
                                  <button onClick={() => tableAction('del-col')} className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">- Delete Column</button>
                                  <button onClick={() => tableAction('del-table')} className="w-full text-left px-4 py-2 text-sm font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Delete Table</button>
                              </div>
                          )}
                      </div>

                      <button onClick={insertTimestamp} title="Log Video Timestamp" className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"><Clock size={16} /></button>
                      <button onClick={executeGeminiExtraction} disabled={isAnalyzing} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all group", isAnalyzing ? "bg-indigo-600/50 text-indigo-300" : "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white")}><Bot size={14} className={isAnalyzing ? "animate-pulse" : ""} /><span className="hidden xl:inline">{isAnalyzing ? "Analyzing..." : "Extract"}</span></button>
                  </div>
               </div>
               
               <div className="flex-1 p-0 relative overflow-x-hidden overflow-y-auto bg-white dark:bg-[#0f172a]" onClick={handleEditorClick}>
                 <ReactQuill 
                    ref={quillRef}
                    theme="snow"
                    value={notes}
                    onChange={handleNotesChange}
                    modules={modules}
                    className="h-full quill-editor-container"
                    placeholder="Type your notes here. Click the grid icon to deploy a table..."
                 />
               </div>
            </div>
          </div>

          {/* Quick Vocab Modal */}
          {showVocabModal && (
              <div className="absolute inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
                      <button onClick={() => setShowVocabModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                      <h3 className="text-xl font-black text-white mb-4">Log New Word</h3>
                      <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
                          <button onClick={() => setVocabLang('en')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", vocabLang === 'en' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}>🇬🇧 English</button>
                          <button onClick={() => setVocabLang('de')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all", vocabLang === 'de' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white")}>🇩🇪 Deutsch</button>
                      </div>
                      <form onSubmit={saveQuickVocab} className="space-y-4">
                          {vocabLang === 'de' && (
                              <div className="grid grid-cols-2 gap-3">
                                  <select value={vType} onChange={e => setVType(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none"><option>Noun</option><option>Verb</option><option>Adjective</option><option>Adverb</option><option>Preposition</option><option>Other</option></select>
                                  {vType === 'Noun' && (<select value={vGender} onChange={e => setVGender(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none"><option value="der">der (M)</option><option value="die">die (F)</option><option value="das">das (N)</option></select>)}
                              </div>
                          )}
                          <div className="relative">
                            <input type="text" placeholder={vocabLang === 'en' ? "Word / Phrase" : "German Word"} value={vWord} onChange={e => setVWord(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                            <button type="button" onClick={autoFillQuickVocab} disabled={isAutoFilling || !vWord} title="AI Auto-Fill Details" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white p-1 rounded-lg transition-all disabled:opacity-50"><Wand2 size={18} className={isAutoFilling ? "animate-spin" : ""} /></button>
                          </div>
                          <input type="text" placeholder={vocabLang === 'en' ? "Definition" : "English Translation"} value={vTrans} onChange={e => setVTrans(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                          {vocabLang === 'de' && vType === 'Noun' && <input type="text" placeholder="Plural (e.g. die Häuser)" value={vPlural} onChange={e => setVPlural(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500" />}
                          {vocabLang === 'de' && vType === 'Verb' && <input type="text" placeholder="Conjugation Notes" value={vConj} onChange={e => setVConj(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-indigo-500" />}
                          <button type="submit" disabled={isSavingVocab || !vWord || !vTrans} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-md transition-all">{isSavingVocab ? "Logging..." : "Secure to Vault"}</button>
                      </form>
                  </div>
              </div>
          )}
        </div>
      )}
      {isNotesDrawerOpen && <NotesDrawer notes={globalNotes} onClose={() => setIsNotesDrawerOpen(false)} search={noteSearch} setSearch={setNoteSearch} />}
    </div>
  )
}

function NotesDrawer({ notes, onClose, search, setSearch }: { notes: any[], onClose: () => void, search: string, setSearch: (val: string) => void }) {
    const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.notes.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[300] flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 slide-in-from-right-full">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between"><h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Library className="text-indigo-500" size={20} /> Global Notes</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 transition-all"><X size={16} /></button></div>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search all notes and concepts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white shadow-inner" autoFocus /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100 dark:bg-slate-950">
                    {filteredNotes.length > 0 ? filteredNotes.map((note, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"><h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-1">{note.title}</h4></div>
                            <div className="p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-x-auto global-notes-content" dangerouslySetInnerHTML={{ __html: note.notes }} />
                        </div>
                    )) : (<div className="flex flex-col items-center justify-center h-full text-slate-400"><Library size={48} className="mb-4 opacity-20" /><p className="text-sm font-bold">No concepts found.</p></div>)}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                .global-notes-content h1, .global-notes-content h2, .global-notes-content h3 { font-weight: 900; color: inherit; margin-top: 1rem; margin-bottom: 0.5rem; }
                .global-notes-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
                .global-notes-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
                .global-notes-content strong { font-weight: 900; color: inherit; }
                .global-notes-content table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                .global-notes-content th, .global-notes-content td { border: 1px solid rgba(148, 163, 184, 0.2); padding: 0.5rem; text-align: left; }
                .global-notes-content th { font-weight: bold; background-color: rgba(99, 102, 241, 0.05); }
                .global-notes-content p { margin-bottom: 1rem; }
                .global-notes-content p:last-child { margin-bottom: 0; }
            `}} />
        </div>
    )
}