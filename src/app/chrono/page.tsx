'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Clock, Map, Play, CheckCircle2, Trash2, Plus, Dumbbell, Briefcase, BookOpen, MapPin, CircleDot, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeBlock {
    id?: string; title: string; start_time: string; end_time: string;
    block_type: 'Routine' | 'Deep Work' | 'Transit';
    linked_task_id?: string | null;
}

export default function ChronoMapPage() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [osTasks, setOsTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form State
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newStart, setNewStart] = useState('08:00')
  const [newEnd, setNewEnd] = useState('09:00')
  const [newType, setNewType] = useState<'Routine' | 'Deep Work' | 'Transit'>('Routine')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
      fetchDailyData()
  }, [])

  const fetchDailyData = async () => {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      // Fetch Time Blocks
      const { data: blocksData } = await supabase.from('time_blocks')
          .select('*').eq('user_id', user.id).eq('date', today).order('start_time', { ascending: true })
      if (blocksData) setBlocks(blocksData)

      // Fetch Active OS Tasks to link
      const { data: tasksData } = await supabase.from('tasks')
          .select('*').eq('user_id', user.id).neq('status', 'completed')
      if (tasksData) setOsTasks(tasksData)

      setIsLoading(false)
  }

  const addTimeBlock = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newTitle.trim() && !selectedTaskId) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let blockTitle = newTitle
      if (newType === 'Deep Work' && selectedTaskId) {
          const linkedTask = osTasks.find(t => t.id === selectedTaskId)
          if (linkedTask) blockTitle = linkedTask.title
      }

      const newBlock = {
          user_id: user.id, title: blockTitle, start_time: newStart, end_time: newEnd,
          block_type: newType, linked_task_id: selectedTaskId, date: new Date().toISOString().split('T')[0]
      }

      const { data } = await supabase.from('time_blocks').insert([newBlock]).select()
      if (data) setBlocks([...blocks, data[0]].sort((a, b) => a.start_time.localeCompare(b.start_time)))
      
      setIsAdding(false); setNewTitle(''); setSelectedTaskId(null);
  }

  const deleteBlock = async (id: string) => {
      await supabase.from('time_blocks').delete().eq('id', id)
      setBlocks(blocks.filter(b => b.id !== id))
  }

  const getIconForType = (type: string) => {
      if (type === 'Deep Work') return <Activity size={18} className="text-indigo-500" />
      if (type === 'Transit') return <MapPin size={18} className="text-amber-500" />
      return <Clock size={18} className="text-emerald-500" />
  }

  const formatTime = (time24: string) => {
      const [hourStr, minute] = time24.split(':')
      const hour = parseInt(hourStr)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const formattedHour = hour % 12 || 12
      return `${formattedHour}:${minute} ${ampm}`
  }

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 mt-4 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20"><Map className="text-indigo-600 dark:text-indigo-400" size={32} /></div>
             Chrono Map
          </h1>
          <p className="text-slate-500 font-bold mt-3 text-sm tracking-wide uppercase">Tactical Day Visualization</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1">
            <Plus size={18} /> Map New Node
        </button>
      </header>

      {isAdding && (
          <form onSubmit={addTimeBlock} className="bg-white dark:bg-[#0f172a] p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl mb-12 animate-in slide-in-from-top-4">
              <h3 className="font-black text-lg text-slate-900 dark:text-white mb-6 uppercase tracking-widest">Configure Time Node</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 col-span-full md:col-span-2 w-fit">
                      <button type="button" onClick={() => setNewType('Routine')} className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", newType === 'Routine' ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><Dumbbell size={16}/> Physical/Routine</button>
                      <button type="button" onClick={() => setNewType('Transit')} className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", newType === 'Transit' ? "bg-white dark:bg-slate-800 text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><MapPin size={16}/> Transit</button>
                      <button type="button" onClick={() => setNewType('Deep Work')} className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", newType === 'Deep Work' ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}><Briefcase size={16}/> OS Mission</button>
                  </div>

                  {newType === 'Deep Work' ? (
                      <select value={selectedTaskId || ''} onChange={e => setSelectedTaskId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white col-span-full" required>
                          <option value="" disabled>Select an active OS Mission...</option>
                          {osTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                  ) : (
                      <input type="text" placeholder={newType === 'Transit' ? "e.g., Commute to T-Works" : "e.g., Strength Training, German B1 Practice"} value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white col-span-full" required />
                  )}

                  <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Start Boundary</label>
                      <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white" required />
                  </div>
                  <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">End Boundary</label>
                      <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white" required />
                  </div>
              </div>
              
              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-md">Deploy Node</button>
              </div>
          </form>
      )}

      {/* THE TIMELINE VISUALIZATION */}
      <div className="relative pt-6 pb-12">
          {/* Vertical Connecting Line */}
          <div className="absolute left-[23px] md:left-[119px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 rounded-full z-0" />

          {blocks.length === 0 && !isLoading && (
              <div className="text-center py-20 opacity-50 relative z-10">
                  <CircleDot size={48} className="mx-auto mb-4 text-slate-400" />
                  <p className="font-bold text-slate-500 uppercase tracking-widest">Map is empty. Awaiting coordinates.</p>
              </div>
          )}

          <div className="space-y-8 relative z-10">
              {blocks.map((block) => (
                  <div key={block.id} className="flex gap-4 md:gap-8 items-start group">
                      
                      {/* Left Side: Time */}
                      <div className="hidden md:flex flex-col items-end w-20 pt-1 shrink-0">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{formatTime(block.start_time)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{formatTime(block.end_time)}</span>
                      </div>

                      {/* Timeline Node */}
                      <div className="relative shrink-0 flex flex-col items-center">
                          <div className={cn("w-12 h-12 rounded-full border-4 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", 
                              block.block_type === 'Deep Work' ? "bg-indigo-100 border-white dark:border-[#0f172a] text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400" :
                              block.block_type === 'Transit' ? "bg-amber-100 border-white dark:border-[#0f172a] text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" :
                              "bg-emerald-100 border-white dark:border-[#0f172a] text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                          )}>
                              {getIconForType(block.block_type)}
                          </div>
                      </div>

                      {/* Right Side: Content Card */}
                      <div className="flex-1 bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group-hover:shadow-xl transition-all group-hover:border-indigo-200 dark:group-hover:border-indigo-800">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-2">
                              <div>
                                  <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-3 inline-block",
                                      block.block_type === 'Deep Work' ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" :
                                      block.block_type === 'Transit' ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                                      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  )}>
                                      {block.block_type}
                                  </span>
                                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{block.title}</h3>
                                  <div className="md:hidden flex gap-2 text-xs font-bold text-slate-500 mt-2">
                                      {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {block.linked_task_id && (
                                      <a href="/flow" className="p-2 bg-slate-100 dark:bg-slate-800 text-indigo-500 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors" title="Launch Deep Work">
                                          <Play size={16}/>
                                      </a>
                                  )}
                                  <button onClick={() => deleteBlock(block.id!)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                      <Trash2 size={16}/>
                                  </button>
                              </div>
                          </div>
                      </div>

                  </div>
              ))}
          </div>
      </div>
    </div>
  )
}