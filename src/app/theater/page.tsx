'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import dynamic from 'next/dynamic'
import YouTube from 'react-youtube'
// 🎯 THE FIX: Added Loader2 and Sparkles to the import list
import { PlaySquare, Plus, ArrowLeft, Trash2, CheckCircle2, Film, Link as LinkIcon, X, Clock, Wand2, Library, Search, Table as TableIcon, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
// @ts-ignore
import 'react-quill-new/dist/quill.snow.css';
import { marked } from 'marked'; 

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
  const [ytPlayer, setYtPlayer] = useState<any>(null)
  
  const quillRef = useRef<any>(null)

  const [notesWidthPercent, setNotesWidthPercent] = useState(35) 
  const [isDragging, setIsDragging] = useState(false)
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
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

  const insertTimestamp = async () => {
    if (ytPlayer) {
        const time = await ytPlayer.getCurrentTime();
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        const secs = Math.floor(time);
        const timeHtml = `&nbsp;<a href="#vid-${secs}" style="color: #8b5cf6; font-weight: bold; cursor: pointer; text-decoration: underline;">▶ [${minutes}:${seconds}]</a>&nbsp;`;
        handleNotesChange(notes + timeHtml);
    }
  }

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
      const target = e.target.closest('a');
      if (target && target.getAttribute('href')?.startsWith('#vid-')) {
          e.preventDefault(); 
          const time = target.getAttribute('href').replace('#vid-', '');
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
          const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: customPrompt, expectJson: vocabLang === 'de' }) })
          if (!res.ok) throw new Error("API Failed");
          const data = await res.json()
          
          if (data.result) {
              if (vocabLang === 'en') setVTrans(data.result);
              else {
                 const parsed = data.result; 
                 if(parsed.translation) setVTrans(parsed.translation);
                 if(parsed.word_type) setVType(parsed.word_type);
                 if(parsed.gender && parsed.word_type === 'Noun') setVGender(parsed.gender);
                 if(parsed.plural) setVPlural(parsed.plural);
                 if(parsed.conjugation) setVConj(parsed.conjugation);
              }
          }
      } catch (e) { alert("Auto-fill analysis failed. Neural link disrupted.") }
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
          setNotes(htmlNotes); handleNotesChange(htmlNotes);
      } else setNotes(rawNotes);
      setPlayingVideo(video);
  }

  const modules = {
    table: true, 
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
      <div className="w-full pb-32 animate-in fade-in duration-500 relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3"><Film className="text-indigo-500" size={32} /> Learning Theater</h1>
            <p className="text-slate-500 font-medium mt-2">Your distraction-free knowledge database.</p>
          </div>
          <div className="flex gap-3">
              <button onClick={() => {fetchGlobalNotes(); setIsNotesDrawerOpen(true);}} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"><Library size={18} /> Global Notes</button>
              <button onClick={() => setIsAddingPlaylist(!isAddingPlaylist)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm flex items-center justify-center gap-2"><Plus size={18} /> New Curriculum</button>
          </div>
        </header>

        {isAddingPlaylist && (
          <form onSubmit={createPlaylist} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-10 flex flex-col md:flex-row gap-4 animate-in slide-in-from-top-4">
            <input type="text" placeholder="Curriculum Title" value={newPlTitle} onChange={e => setNewPlTitle(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm font-semibold outline-none dark:text-white focus:border-indigo-500 transition-colors" required />
            <input type="text" placeholder="Description..." value={newPlDesc} onChange={e => setNewPlDesc(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm font-medium outline-none dark:text-white focus:border-indigo-500 transition-colors" />
            <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">Create</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {playlists.map(pl => (
            <div key={pl.id} onClick={() => setActivePlaylist(pl)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group flex flex-col">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shrink-0"><PlaySquare size={20} className="text-indigo-600 dark:text-indigo-400" /></div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{pl.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 flex-1">{pl.description || "No description provided."}</p>
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
    <div className="w-full pb-32 animate-in fade-in relative">
      
      <style dangerouslySetInnerHTML={{__html: `
        .quill-editor-container { height: calc(100% - 42px); }
        .dark .ql-toolbar { background-color: #0f172a; border-color: #1e293b !important; }
        .dark .ql-container { border-color: #1e293b !important; font-family: inherit; font-size: 1rem; color: #f8fafc; }
        .dark .ql-stroke { stroke: #cbd5e1 !important; }
        .dark .ql-fill { fill: #cbd5e1 !important; }
        .dark .ql-picker { color: #cbd5e1 !important; }
        .dark .ql-editor.ql-blank::before { color: #64748b; font-style: normal; }
        .ql-editor { padding: 2rem; line-height: 1.7; }
        .ql-editor h1, .ql-editor h2, .ql-editor h3 { font-weight: 800; margin-bottom: 1rem; }
        .ql-editor table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; background-color: rgba(255,255,255,0.02); border-radius: 8px; overflow: hidden; }
        .ql-editor th, .ql-editor td { border: 1px solid rgba(148, 163, 184, 0.2); padding: 0.75rem; text-align: left; }
        .ql-editor th { font-weight: bold; background-color: rgba(99, 102, 241, 0.05); }
        .ql-editor blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; color: #94a3b8; font-style: italic; }
      `}} />

      <button onClick={() => setActivePlaylist(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-6 transition-colors"><ArrowLeft size={16} /> Back to Theater</button>

      <header className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{activePlaylist.title}</h1>
          <p className="text-slate-500 font-medium">{activePlaylist.description}</p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 max-w-xs h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
            <span className="text-xs font-bold text-slate-500">{progress}% Complete ({watchedCount}/{videos.length})</span>
          </div>
        </div>
        <button onClick={() => deletePlaylist(activePlaylist.id)} className="text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-900/20 p-2.5 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"><Trash2 size={18} /></button>
      </header>

      <form onSubmit={processYouTubeUrl} className="flex flex-col md:flex-row gap-3 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex-1 relative">
          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="url" placeholder="Paste YouTube Video OR Playlist Link here..." value={newVidUrl} onChange={e => setNewVidUrl(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white transition-colors" required />
        </div>
        <button type="submit" disabled={isProcessingUrl} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-sm disabled:opacity-50 min-w-[160px] transition-colors">{isProcessingUrl ? 'Importing...' : 'Add to Curriculum'}</button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video, index) => (
          <div key={video.id} className={cn("bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all group flex flex-col", video.is_watched ? "border-emerald-200 dark:border-emerald-900/30 opacity-70" : "border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700")}>
            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer shrink-0" onClick={() => openTheater(video)}>
              <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded md z-10 backdrop-blur-md">Module {index + 1}</div>
              <img src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/40 flex items-center justify-center transition-all"><div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-indigo-600 shadow-lg scale-90 group-hover:scale-110 transition-transform"><PlaySquare size={20} className="ml-0.5" /></div></div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-4 leading-tight flex-1">{video.title}</h4>
              <div className="flex items-center justify-between shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => toggleWatched(video)} className={cn("text-xs font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors", video.is_watched ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700")}><CheckCircle2 size={14} /> {video.is_watched ? 'Watched' : 'Mark Watched'}</button>
                <button onClick={() => deleteVideo(video.id)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {playingVideo && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300 overflow-hidden" style={{ userSelect: isDragging ? 'none' : 'auto' }}>
          
          <div className="h-14 flex-shrink-0 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-3">
               <button onClick={() => {setPlayingVideo(null); setYtPlayer(null);}} className="flex items-center gap-2 text-slate-400 hover:text-white font-semibold px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-colors"><X size={18} /> <span className="hidden md:inline text-sm">Close</span></button>
               <h3 className="text-slate-300 font-medium truncate max-w-[200px] lg:max-w-xl text-sm border-l border-slate-700 pl-3">{playingVideo.title}</h3>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => {fetchGlobalNotes(); setIsNotesDrawerOpen(true);}} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"><Library size={14} /> <span className="hidden md:inline">Notes</span></button>
                <button onClick={() => setShowVocabModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all"><Plus size={14} /> <span className="hidden md:inline">Vocab</span></button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
            
            {/* VIDEO PANE */}
            <div className="bg-black flex items-center justify-center relative" style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${100 - notesWidthPercent}%` : '100%' }}>
               <div className="w-full h-full relative">
                  <YouTube videoId={playingVideo.youtube_id} opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, modestbranding: 1, rel: 0 } }} onReady={(e) => setYtPlayer(e.target)} className="absolute inset-0 w-full h-full" iframeClassName="w-full h-full" />
               </div>
            </div>

            {/* RESIZER HANDLE */}
            <div onMouseDown={() => setIsDragging(true)} className={cn("hidden lg:flex w-1 bg-slate-900 border-l border-r border-slate-800 hover:bg-indigo-500 cursor-col-resize items-center justify-center transition-colors z-50", isDragging ? "bg-indigo-500" : "")} />

            {/* NOTES PANE */}
            <div className="bg-white dark:bg-[#0f172a] flex flex-col h-full relative" style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${notesWidthPercent}%` : '100%' }}>
               
               <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                     <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Deep Focus</span>
                     {saveStatus === 'saving' && <span className="text-[9px] text-slate-500 uppercase tracking-widest animate-pulse">Saving</span>}
                     {saveStatus === 'saved' && <span className="text-[9px] text-emerald-500 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={10} /> Saved</span>}
                  </div>
                  
                  <div className="flex gap-1 relative">
                      <div className="relative">
                          <button onClick={() => setShowTableMenu(!showTableMenu)} title="Table Toolkit" className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-500 transition-all"><TableIcon size={14} /></button>
                          
                          {showTableMenu && (
                              <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-[200] animate-in zoom-in-95">
                                  <div className="px-3 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800 text-[9px] font-bold uppercase tracking-widest text-slate-400">Toolkit</div>
                                  <button onClick={() => tableAction('insert')} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-500">Insert 2x2 Table</button>
                                  <button onClick={() => tableAction('row-above')} className="w-full text-left px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">+ Row Above</button>
                                  <button onClick={() => tableAction('row-below')} className="w-full text-left px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">+ Row Below</button>
                                  <button onClick={() => tableAction('col-left')} className="w-full text-left px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">+ Col Left</button>
                                  <button onClick={() => tableAction('col-right')} className="w-full text-left px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">+ Col Right</button>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                  <button onClick={() => tableAction('del-row')} className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">- Delete Row</button>
                                  <button onClick={() => tableAction('del-col')} className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">- Delete Col</button>
                                  <button onClick={() => tableAction('del-table')} className="w-full text-left px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Delete Table</button>
                              </div>
                          )}
                      </div>
                      <button onClick={insertTimestamp} title="Log Video Timestamp" className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"><Clock size={14} /></button>
                  </div>
               </div>
               
               <div className="flex-1 p-0 relative overflow-x-hidden overflow-y-auto bg-white dark:bg-[#0f172a]" onClick={handleEditorClick}>
                 <ReactQuill ref={quillRef} theme="snow" value={notes} onChange={handleNotesChange} modules={modules} className="h-full quill-editor-container" placeholder="Type notes here. Click table icon to deploy grid..." />
               </div>
            </div>
          </div>

          {showVocabModal && (
              <div className="absolute inset-0 z-[200] bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
                      <button onClick={() => setShowVocabModal(false)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"><X size={18}/></button>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Log New Word</h3>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-5">
                          <button onClick={() => setVocabLang('en')} className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-all", vocabLang === 'en' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-white")}>🇬🇧 English</button>
                          <button onClick={() => setVocabLang('de')} className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-all", vocabLang === 'de' ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-white")}>🇩🇪 Deutsch</button>
                      </div>
                      <form onSubmit={saveQuickVocab} className="space-y-3">
                          {vocabLang === 'de' && (
                              <div className="grid grid-cols-2 gap-3">
                                  <select value={vType} onChange={e => setVType(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none"><option value="Noun">Noun</option><option value="Verb">Verb</option><option value="Adjective">Adjective</option><option value="Adverb">Adverb</option><option value="Preposition">Preposition</option><option value="Phrase">Phrase / Idiom</option><option value="Grammar">Grammar Rule</option><option value="Other">Other</option></select>
                                  {vType === 'Noun' && (<select value={vGender} onChange={e => setVGender(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none"><option value="der">der (M)</option><option value="die">die (F)</option><option value="das">das (N)</option></select>)}
                              </div>
                          )}
                          <div className="relative">
                            <input type="text" placeholder={vocabLang === 'en' ? "Word / Phrase" : "German Term"} value={vWord} onChange={e => setVWord(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" required />
                            <button type="button" onClick={autoFillQuickVocab} disabled={isAutoFilling || !vWord} title="AI Auto-Fill Details" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded-md transition-colors disabled:opacity-50"><Wand2 size={16} className={isAutoFilling ? "animate-spin" : ""} /></button>
                          </div>
                          <input type="text" placeholder={vocabLang === 'en' ? "Definition" : "English Translation / Meaning"} value={vTrans} onChange={e => setVTrans(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" required />
                          
                          {vocabLang === 'de' && vType === 'Noun' && <input type="text" placeholder="Plural (e.g. die Häuser)" value={vPlural} onChange={e => setVPlural(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" />}
                          {vocabLang === 'de' && vType === 'Verb' && (
                              <>
                                  <input type="text" placeholder="Present (ich, du, er/sie/es, wir, ihr, sie)" value={vConj} onChange={e => setVConj(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                                  <div className="grid grid-cols-2 gap-3">
                                      <input type="text" placeholder="Präteritum" value={vPlural} onChange={e => setVPlural(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                                      <input type="text" placeholder="Perfekt" value={vConj} onChange={e => setVConj(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                                  </div>
                              </>
                          )}
                          <button type="submit" disabled={isSavingVocab || !vWord || !vTrans} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center text-sm">{isSavingVocab ? <Wand2 size={16} className="animate-spin" /> : "Secure to Vault"}</button>
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
        <div className="fixed inset-0 z-[300] flex justify-end bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 slide-in-from-right-full">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between"><h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Library className="text-indigo-600 dark:text-indigo-400" size={18} /> Global Notes</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} /></button></div>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search all notes and concepts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 dark:text-white shadow-sm" autoFocus /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
                    {filteredNotes.length > 0 ? filteredNotes.map((note, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"><h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{note.title}</h4></div>
                            <div className="p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed overflow-x-auto global-notes-content" dangerouslySetInnerHTML={{ __html: note.notes }} />
                        </div>
                    )) : (<div className="flex flex-col items-center justify-center h-full text-slate-400"><Library size={40} className="mb-3 opacity-30" /><p className="text-sm font-semibold">No concepts found.</p></div>)}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                .global-notes-content h1, .global-notes-content h2, .global-notes-content h3 { font-weight: 800; color: inherit; margin-top: 1rem; margin-bottom: 0.5rem; }
                .global-notes-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
                .global-notes-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
                .global-notes-content strong { font-weight: bold; color: inherit; }
                .global-notes-content table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                .global-notes-content th, .global-notes-content td { border: 1px solid rgba(148, 163, 184, 0.2); padding: 0.5rem; text-align: left; }
                .global-notes-content th { font-weight: bold; background-color: rgba(99, 102, 241, 0.05); }
                .global-notes-content p { margin-bottom: 1rem; }
                .global-notes-content p:last-child { margin-bottom: 0; }
            `}} />
        </div>
    )
}