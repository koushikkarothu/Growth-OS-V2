'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import confetti from 'canvas-confetti'
import { 
  Plus, Clock, CheckCircle2, AlertCircle, PlayCircle, 
  MoreVertical, ChevronDown, ChevronUp, Trash2,
  AlertTriangle, ArrowRight, Compass, Target
} from 'lucide-react'
import { format, differenceInDays, parseISO, isAfter } from 'date-fns'
import { cn } from '@/lib/utils'

interface Subtask {
  id: number; title: string; is_completed: boolean; start_date?: string; end_date?: string
}

interface Milestone {
  id: number; title: string; description: string; target_date: string; 
  category: string; status: 'pending' | 'active' | 'completed';
  subtasks?: Subtask[]
}

export default function RoadmapPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [category, setCategory] = useState('Academics')

  useEffect(() => { fetchMilestones() }, [])

  async function fetchMilestones() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data } = await supabase
      .from('roadmap')
      .select('*, subtasks:roadmap_subtasks(*)')
      .eq('user_id', user.id)
      .order('target_date', { ascending: true })
    
    if (data) {
        const sortedData = data.map((m: any) => ({
            ...m,
            subtasks: m.subtasks.sort((a: any, b: any) => new Date(a.end_date || '9999-12-31').getTime() - new Date(b.end_date || '9999-12-31').getTime())
        }))
        setMilestones(sortedData)
    }
    setLoading(false)
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !targetDate) return
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from('roadmap').insert([{ 
      user_id: user?.id, title, description, target_date: targetDate, 
      category, status: 'pending' 
    }])
    
    setIsAdding(false); setTitle(''); setDescription(''); setTargetDate('');
    fetchMilestones()
  }

  return (
    <div className="w-full pb-32 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Compass className="text-indigo-600 dark:text-indigo-400" size={32} /> Master Roadmap
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-sm md:text-base">Strategic Timeline & Critical Paths.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 w-full md:w-auto"
        >
          <Plus size={18} /> Plot Objective
        </button>
      </header>

      {/* ADD FORM */}
      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl mb-12 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Target size={18} className="text-indigo-500"/> Initialize New Vector</h3>
          <form onSubmit={addMilestone}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Mission Title</label>
                    <input type="text" placeholder="e.g. Master's in Germany" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors dark:text-white" required />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Deadline</label>
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors dark:text-white" required />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Sector / Category</label>
                    <input type="text" placeholder="e.g. Academics, Finance" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors dark:text-white" required />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Briefing</label>
                    <input type="text" placeholder="Key details..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors dark:text-white" />
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors">Confirm Coordinates</button>
            </div>
          </form>
        </div>
      )}

      {/* THE TIMELINE */}
      <div className="relative pl-2 md:pl-8">
        <div className="absolute left-[24px] md:left-[51px] top-4 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />

        <div className="space-y-8 md:space-y-10">
          {milestones.length === 0 && !loading && (
             <div className="ml-12 md:ml-24 py-16 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <Compass className="mx-auto text-slate-400 mb-3" size={32} />
                <p className="text-slate-900 dark:text-white font-bold text-lg mb-1">No plotted milestones.</p>
                <p className="text-slate-500 text-sm">Initialize a new vector to build your roadmap.</p>
             </div>
          )}
          {milestones.map((m) => (
             <MilestoneCard key={m.id} milestone={m} onRefresh={fetchMilestones} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MilestoneCard({ milestone, onRefresh }: { milestone: Milestone, onRefresh: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  
  const [stTitle, setStTitle] = useState('')
  const [stStart, setStStart] = useState('')
  const [stEnd, setStEnd] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const totalSub = milestone.subtasks?.length || 0
  const completedSub = milestone.subtasks?.filter(s => s.is_completed).length || 0
  const progress = totalSub === 0 ? 0 : Math.round((completedSub / totalSub) * 100)
  
  const daysLeft = differenceInDays(parseISO(milestone.target_date), new Date())
  const isOverdue = daysLeft < 0 && milestone.status !== 'completed'
  const isFullyComplete = progress === 100 && totalSub > 0

  let statusColor = "slate"
  let StatusIcon = Clock
  let statusLabel = `${daysLeft} Days Remaining`

  if (milestone.status === 'active') {
      statusColor = "indigo"
      StatusIcon = PlayCircle
      statusLabel = "Mission Active"
  } else if (milestone.status === 'completed') {
      statusColor = "emerald"
      StatusIcon = CheckCircle2
      statusLabel = "Mission Complete"
  } else if (isOverdue) {
      statusColor = "red"
      StatusIcon = AlertCircle
      statusLabel = `Overdue by ${Math.abs(daysLeft)} Days`
  }

  const triggerConfetti = () => confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#059669'] })

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    if (isAfter(parseISO(stEnd), parseISO(milestone.target_date))) { setErrorMsg(`Subtask cannot end after milestone deadline (${milestone.target_date})`); return }
    if (stStart && isAfter(parseISO(stStart), parseISO(stEnd))) { setErrorMsg("Start date cannot be after end date"); return }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('roadmap_subtasks').insert([{ roadmap_id: milestone.id, user_id: user?.id, title: stTitle, start_date: stStart || null, end_date: stEnd }])
    
    if (milestone.status === 'completed') await supabase.from('roadmap').update({ status: 'active' }).eq('id', milestone.id)
    setStTitle(''); setStStart(''); setStEnd(''); onRefresh(); if(!isExpanded) setIsExpanded(true)
  }

  async function toggleSubtask(sub: Subtask) {
    const newVal = !sub.is_completed
    await supabase.from('roadmap_subtasks').update({ is_completed: newVal }).eq('id', sub.id)
    
    if (newVal) { 
       if (completedSub + 1 === totalSub) { await supabase.from('roadmap').update({ status: 'completed' }).eq('id', milestone.id); triggerConfetti() }
    } else { 
       if (milestone.status === 'completed') await supabase.from('roadmap').update({ status: 'active' }).eq('id', milestone.id)
    }
    onRefresh()
  }

  async function updateStatus(status: string) {
    await supabase.from('roadmap').update({ status }).eq('id', milestone.id)
    if (status === 'completed') triggerConfetti()
    setMenuOpen(false); onRefresh()
  }

  async function deleteMilestone() {
    if (!confirm("Scrap this mission plan?")) return
    await supabase.from('roadmap').delete().eq('id', milestone.id)
    onRefresh()
  }

  async function deleteSubtask(id: number) {
    await supabase.from('roadmap_subtasks').delete().eq('id', id); onRefresh()
  }

  const getBorderColor = () => {
      if (statusColor === 'indigo') return "border-indigo-300 dark:border-indigo-700 shadow-sm"
      if (statusColor === 'emerald') return "border-emerald-200 dark:border-emerald-900/50 shadow-sm"
      if (statusColor === 'red') return "border-red-300 dark:border-red-900/50 shadow-sm"
      return "border-slate-200 dark:border-slate-800"
  }

  return (
    <div className={cn("relative flex items-start group transition-all duration-500", milestone.status === 'completed' ? "opacity-70 grayscale-[20%]" : "opacity-100")}>
      
      {/* NODE */}
      <div className={cn(
        "absolute left-0 mt-6 md:mt-7 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-slate-950 z-10 transition-all duration-300 shadow-sm",
        statusColor === 'indigo' ? "bg-indigo-600 text-white" : 
        statusColor === 'emerald' ? "bg-emerald-500 text-white" :
        statusColor === 'red' ? "bg-red-500 text-white" : "bg-white dark:bg-slate-800 text-slate-400"
      )}>
        <StatusIcon className="w-5 h-5 md:w-6 md:h-6" />
      </div>

      {/* CARD */}
      <div className={cn(
        "ml-14 md:ml-20 w-full bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-500 relative overflow-hidden hover:shadow-md",
        getBorderColor()
      )}>
        
        {/* HEADER */}
        <div className="p-5 md:p-6 pb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{milestone.category}</span>
                        <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", 
                            statusColor === 'red' ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" : 
                            statusColor === 'emerald' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : 
                            statusColor === 'indigo' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}>
                            {statusLabel}
                        </div>
                    </div>
                    <h3 className={cn("text-lg md:text-xl font-bold transition-colors leading-tight", statusColor === 'emerald' ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white")}>
                        {milestone.title}
                    </h3>
                    {milestone.description && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">{milestone.description}</p>}
                </div>
                
                <div className="relative shrink-0">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><MoreVertical size={18} className="text-slate-400" /></button>
                    {menuOpen && (
                        <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1.5 animate-in zoom-in-95">
                            {!isFullyComplete && milestone.status !== 'active' && <button onClick={() => updateStatus('active')} className="w-full text-left px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700">Set Active</button>}
                            {milestone.status !== 'completed' && <button onClick={() => updateStatus('completed')} className="w-full text-left px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700">Mark Complete</button>}
                            <button onClick={() => updateStatus('pending')} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Mark Pending</button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                            <button onClick={deleteMilestone} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Delete Mission</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>Execution Status</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-1000 ease-out rounded-full", statusColor === 'emerald' ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>

        {/* EXPANDABLE AREA */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-3.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                   <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border", isFullyComplete ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700")}>
                      {completedSub} / {totalSub} Steps
                   </div>
                   {errorMsg && <span className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1"><AlertTriangle size={12} /> <span className="hidden md:inline">{errorMsg}</span></span>}
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            
            {isExpanded && (
                <div className="p-4 pt-1 animate-in slide-in-from-top-2">
                    <div className="space-y-2 mb-4">
                        {milestone.subtasks?.map(sub => {
                            const isSubOverdue = sub.end_date ? isAfter(new Date(), parseISO(sub.end_date)) && !sub.is_completed : false
                            return (
                                <div key={sub.id} className="flex items-start md:items-center gap-3 group/sub p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-slate-700 transition-all">
                                    <button 
                                        onClick={() => toggleSubtask(sub)}
                                        className={cn("w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 mt-0.5 md:mt-0", sub.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-indigo-500")}
                                    >
                                        {sub.is_completed && <CheckCircle2 size={12} />}
                                    </button>
                                    
                                    <div className="flex-1 min-w-0">
                                       <div className={cn("text-sm font-semibold transition-all leading-tight truncate", sub.is_completed ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-200")}>
                                           {sub.title}
                                       </div>
                                       {sub.end_date && (
                                           <div className="flex items-center gap-1.5 mt-1">
                                              <span className={cn("text-[9px] font-bold uppercase tracking-wider", isSubOverdue ? "text-red-600 dark:text-red-400" : "text-slate-400")}>
                                                {sub.start_date ? `${format(parseISO(sub.start_date), 'MMM d')} - ` : ''}{format(parseISO(sub.end_date), 'MMM d')}
                                              </span>
                                              {isSubOverdue && <span className="text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50">LATE</span>}
                                           </div>
                                       )}
                                    </div>
                                    <button onClick={() => deleteSubtask(sub.id)} className="opacity-100 md:opacity-0 group-hover/sub:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                                </div>
                            )
                        })}
                    </div>

                    {!isFullyComplete && (
                        <form onSubmit={addSubtask} className="flex flex-col xl:flex-row gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <input type="text" placeholder="New Step..." value={stTitle} onChange={e => setStTitle(e.target.value)} className="w-full xl:flex-[2] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium outline-none text-slate-900 dark:text-white focus:border-indigo-500 transition-colors" />
                            <div className="flex flex-1 items-center gap-2">
                                <div className="flex items-center gap-2 flex-1 bg-slate-50 dark:bg-slate-950 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-800">
                                    <span className="text-[9px] font-bold text-slate-400">START</span>
                                    <input type="date" value={stStart} onChange={e => setStStart(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none w-full" />
                                </div>
                                <ArrowRight size={14} className="text-slate-400 shrink-0 hidden sm:block" />
                                <div className="flex items-center gap-2 flex-1 bg-slate-50 dark:bg-slate-950 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-800">
                                    <span className="text-[9px] font-bold text-slate-400">DUE</span>
                                    <input type="date" value={stEnd} onChange={e => setStEnd(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none w-full" required />
                                </div>
                            </div>
                            <button type="submit" disabled={!stTitle || !stEnd} className="w-full xl:w-auto shrink-0 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-50 transition-colors">Add</button>
                        </form>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  )
}