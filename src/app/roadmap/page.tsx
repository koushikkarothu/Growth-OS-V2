'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import confetti from 'canvas-confetti'
import { 
  Map, Plus, Clock, CheckCircle2, AlertCircle, PlayCircle, 
  MoreVertical, Calendar as CalIcon, ChevronDown, ChevronUp, Trash2,
  AlertTriangle, ArrowRight
} from 'lucide-react'
import { format, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns'
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
  
  // New Milestone Form
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
        // Sort subtasks by end_date so urgency is visible
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
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Map className="text-indigo-600 dark:text-indigo-400" size={36} /> Master Plan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-lg">Strategic Timeline & Critical Paths</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-slate-900 dark:bg-white hover:bg-indigo-600 dark:hover:bg-indigo-400 text-white dark:text-slate-900 px-8 py-3 rounded-2xl font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2 active:scale-95"
        >
          <Plus size={20} /> Plot Objective
        </button>
      </header>

      {/* ADD FORM */}
      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl mb-12 animate-in slide-in-from-top-6">
          <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-6">Initialize New Vector</h3>
          <form onSubmit={addMilestone}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mission Title</label>
                    <input type="text" placeholder="e.g. Master's in Germany" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-all dark:text-white" required />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deadline</label>
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-all dark:text-white" required />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sector</label>
                    <input type="text" placeholder="e.g. Academics, Finance" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-all dark:text-white" required />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Briefing</label>
                    <input type="text" placeholder="Key details..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-all dark:text-white" />
                </div>
            </div>
            <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-8 py-3 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all">Confirm Coordinates</button>
            </div>
          </form>
        </div>
      )}

      {/* THE TIMELINE */}
      <div className="relative pl-4 md:pl-8">
        {/* The Timeline Line */}
        <div className="absolute left-[43px] top-4 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />

        <div className="space-y-12">
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
  
  // Subtask Form
  const [stTitle, setStTitle] = useState('')
  const [stStart, setStStart] = useState('')
  const [stEnd, setStEnd] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // LOGIC: Progress & Status
  const totalSub = milestone.subtasks?.length || 0
  const completedSub = milestone.subtasks?.filter(s => s.is_completed).length || 0
  const progress = totalSub === 0 ? 0 : Math.round((completedSub / totalSub) * 100)
  
  // LOGIC: Dates
  const daysLeft = differenceInDays(parseISO(milestone.target_date), new Date())
  const isOverdue = daysLeft < 0 && milestone.status !== 'completed'
  const isFullyComplete = progress === 100 && totalSub > 0

  // 🎨 DYNAMIC VISUALS
  let statusColor = "slate" // Default
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

  // --- ACTIONS ---
  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#059669'] })
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    // 🔒 VALIDATION: Subtask cannot end after Milestone
    if (isAfter(parseISO(stEnd), parseISO(milestone.target_date))) {
        setErrorMsg(`Subtask cannot end after milestone deadline (${milestone.target_date})`)
        return
    }
    // 🔒 VALIDATION: Start cannot be after End
    if (isAfter(parseISO(stStart), parseISO(stEnd))) {
        setErrorMsg("Start date cannot be after end date")
        return
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('roadmap_subtasks').insert([{ 
        roadmap_id: milestone.id, 
        user_id: user?.id, 
        title: stTitle,
        start_date: stStart,
        end_date: stEnd 
    }])
    
    // Auto-Reopen if adding to a completed task
    if (milestone.status === 'completed') {
        await supabase.from('roadmap').update({ status: 'active' }).eq('id', milestone.id)
    }

    setStTitle(''); setStStart(''); setStEnd('')
    onRefresh()
    if(!isExpanded) setIsExpanded(true)
  }

  async function toggleSubtask(sub: Subtask) {
    const newVal = !sub.is_completed
    await supabase.from('roadmap_subtasks').update({ is_completed: newVal }).eq('id', sub.id)
    
    // 🤖 AUTO-COMPLETION LOGIC
    if (newVal) { // If checking OFF
       // Check if this was the last one
       const newCount = completedSub + 1
       if (newCount === totalSub) {
           await supabase.from('roadmap').update({ status: 'completed' }).eq('id', milestone.id)
           triggerConfetti()
       }
    } else { // If unchecking
       if (milestone.status === 'completed') {
           await supabase.from('roadmap').update({ status: 'active' }).eq('id', milestone.id)
       }
    }
    onRefresh()
  }

  async function updateStatus(status: string) {
    await supabase.from('roadmap').update({ status }).eq('id', milestone.id)
    if (status === 'completed') triggerConfetti()
    setMenuOpen(false)
    onRefresh()
  }

  async function deleteMilestone() {
    if (!confirm("Scrap this mission plan?")) return
    await supabase.from('roadmap').delete().eq('id', milestone.id)
    onRefresh()
  }

  async function deleteSubtask(id: number) {
    await supabase.from('roadmap_subtasks').delete().eq('id', id)
    onRefresh()
  }

  // Helper to get border color class
  const getBorderColor = () => {
      if (statusColor === 'indigo') return "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
      if (statusColor === 'emerald') return "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] bg-emerald-50/10"
      if (statusColor === 'red') return "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
      return "border-slate-200 dark:border-slate-800"
  }

  return (
    <div className="relative flex items-start group">
      
      {/* ICON NODE */}
      <div className={cn(
        "absolute left-0 mt-8 w-20 h-20 rounded-3xl flex items-center justify-center border-[6px] border-white dark:border-slate-950 z-10 transition-all duration-300 shadow-lg",
        statusColor === 'indigo' ? "bg-indigo-600 text-white" : 
        statusColor === 'emerald' ? "bg-emerald-500 text-white" :
        statusColor === 'red' ? "bg-red-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
      )}>
        <StatusIcon size={32} />
      </div>

      {/* CARD */}
      <div className={cn(
        "ml-28 w-full bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-xl",
        getBorderColor()
      )}>
        
        {/* Header Section */}
        <div className="p-8 pb-4">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{milestone.category}</span>
                        <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", 
                            statusColor === 'red' ? "bg-red-100 text-red-600" : 
                            statusColor === 'emerald' ? "bg-emerald-100 text-emerald-600" : 
                            statusColor === 'indigo' ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                        )}>
                            {statusLabel}
                        </div>
                    </div>
                    <h3 className={cn("text-2xl font-black transition-colors", statusColor === 'emerald' ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white")}>
                        {milestone.title}
                    </h3>
                    {milestone.description && <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">{milestone.description}</p>}
                </div>
                
                {/* Options */}
                <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><MoreVertical size={20} className="text-slate-400" /></button>
                    {menuOpen && (
                        <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-20 py-2 animate-in zoom-in-95">
                            {/* Logic: Can't set active if fully complete */}
                            {!isFullyComplete && milestone.status !== 'active' && 
                                <button onClick={() => updateStatus('active')} className="w-full text-left px-5 py-3 text-xs font-bold text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700">Set Active</button>
                            }
                            {milestone.status !== 'completed' && 
                                <button onClick={() => updateStatus('completed')} className="w-full text-left px-5 py-3 text-xs font-bold text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-700">Mark Complete</button>
                            }
                            <button onClick={() => updateStatus('pending')} className="w-full text-left px-5 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">Mark Pending</button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
                            <button onClick={deleteMilestone} className="w-full text-left px-5 py-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Delete Mission</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Execution Status</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className={cn("h-full transition-all duration-1000 ease-out rounded-full", statusColor === 'emerald' ? "bg-emerald-500" : "bg-indigo-600")} 
                        style={{ width: `${progress}%` }} 
                    />
                </div>
            </div>
        </div>

        {/* EXPANDABLE AREA */}
        <div className="bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-slate-800/50">
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                   <div className={cn("text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider", isFullyComplete ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
                      {completedSub} / {totalSub} Steps
                   </div>
                   {errorMsg && <span className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12} /> {errorMsg}</span>}
                </div>
                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>
            
            {isExpanded && (
                <div className="p-6 pt-2 animate-in slide-in-from-top-2">
                    {/* Subtasks List */}
                    <div className="space-y-3 mb-6">
                        {milestone.subtasks?.map(sub => {
                            const isSubOverdue = sub.end_date ? isAfter(new Date(), parseISO(sub.end_date)) && !sub.is_completed : false
                            
                            return (
                                <div key={sub.id} className="flex items-center gap-4 group/sub p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                                    <button 
                                        onClick={() => toggleSubtask(sub)}
                                        className={cn(
                                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0",
                                            sub.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-indigo-500"
                                        )}
                                    >
                                        {sub.is_completed && <CheckCircle2 size={14} />}
                                    </button>
                                    
                                    <div className="flex-1">
                                       <div className={cn("text-sm font-semibold transition-all", sub.is_completed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200")}>
                                           {sub.title}
                                       </div>
                                       {sub.end_date && (
                                           <div className="flex items-center gap-2 mt-1">
                                              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isSubOverdue ? "text-red-500" : "text-slate-400")}>
                                                {format(parseISO(sub.start_date || new Date().toISOString()), 'MMM d')} - {format(parseISO(sub.end_date), 'MMM d')}
                                              </span>
                                              {isSubOverdue && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 rounded">LATE</span>}
                                           </div>
                                       )}
                                    </div>

                                    <button onClick={() => deleteSubtask(sub.id)} className="opacity-0 group-hover/sub:opacity-100 text-slate-300 hover:text-red-500 transition-all p-2"><Trash2 size={16} /></button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Add Subtask Form */}
                    {!isFullyComplete && (
                        <form onSubmit={addSubtask} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-100 dark:bg-slate-800/50 p-3 rounded-2xl">
                            <input 
                                type="text" 
                                placeholder="New Step..." 
                                value={stTitle} 
                                onChange={e => setStTitle(e.target.value)} 
                                className="flex-1 bg-transparent px-2 text-sm font-medium outline-none text-slate-700 dark:text-white placeholder:text-slate-400"
                            />
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400">START</span>
                                    <input type="date" value={stStart} onChange={e => setStStart(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none w-24" required />
                                </div>
                                <ArrowRight size={12} className="text-slate-400" />
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400">DUE</span>
                                    <input type="date" value={stEnd} onChange={e => setStEnd(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none w-24" required />
                                </div>
                            </div>
                            <button type="submit" disabled={!stTitle || !stEnd} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase disabled:opacity-50 transition-all shadow-md">Add</button>
                        </form>
                    )}
                </div>
            )}
        </div>

      </div>
    </div>
  )
}