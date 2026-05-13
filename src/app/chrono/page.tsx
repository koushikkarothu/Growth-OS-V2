'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Map as MapIcon, Plus, Dumbbell, Briefcase, MapPin, CheckCircle2, Trash2, Play, CircleDot, Activity, Pencil, X, Save, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// --- Types ---
interface TimeBlock { id: string; title: string; start_time: string; end_time: string; block_type: 'Routine' | 'Deep Work' | 'Transit'; linked_task_id?: string | null; is_completed?: boolean }
interface OS_Task { id: string; title: string; status: string; type: string; last_completed_at: string }

// --- Helper Functions ---
const timeToMinutes = (timeStr: string) => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; }
const formatTime = (time24: string) => { 
    if (!time24) return '';
    const [h, m] = time24.split(':'); const hNum = parseInt(h); 
    return `${hNum % 12 || 12}:${m} ${hNum >= 12 ? 'PM' : 'AM'}`; 
}

// --- Sortable Node Component ---
function SortableNode({ block, isActive, isPast, progress, onDelete, onComplete, onEdit }: { block: TimeBlock, isActive: boolean, isPast: boolean, progress: number, onDelete: (id: string) => void, onComplete: (id: string, taskId?: string) => void, onEdit: (block: TimeBlock) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
    const style = { transform: CSS.Transform.toString(transform), transition }

    const getIcon = () => {
        if (block.block_type === 'Deep Work') return <Briefcase size={18} />
        if (block.block_type === 'Transit') return <MapPin size={18} />
        return <Dumbbell size={18} />
    }

    return (
        <div ref={setNodeRef} style={style} className="flex gap-4 md:gap-8 items-center w-full group relative z-10 node-element" data-id={block.id}>
            
            {/* TIME COLUMN */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing w-24 text-right shrink-0 hover:text-indigo-500 transition-colors">
                <span className={cn("text-sm font-black block", isActive ? "text-indigo-500" : "text-slate-900 dark:text-white")}>{formatTime(block.start_time)}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatTime(block.end_time)}</span>
            </div>

            {/* THE PHYSICS NODE */}
            <motion.div 
                animate={isActive ? { scale: [1, 1.15, 1], boxShadow: "0px 0px 25px rgba(99,102,241,0.8)" } : {}} 
                transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                className={cn("w-14 h-14 shrink-0 rounded-full border-4 flex items-center justify-center shadow-lg bg-white dark:bg-slate-900 z-20 transition-colors", 
                    block.is_completed ? "border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" :
                    isActive ? "border-indigo-500 text-indigo-500" :
                    isPast ? "border-red-500/40 text-red-500/40" : "border-slate-200 dark:border-slate-800 text-slate-400"
                )}
            >
                {block.is_completed ? <CheckCircle2 size={24} /> : getIcon()}
            </motion.div>

            {/* THE CONTENT CARD */}
            <div className={cn("flex-1 p-5 rounded-[2rem] border transition-all flex flex-col justify-center",
                block.is_completed ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30 opacity-70" :
                isActive ? "bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-xl ring-1 ring-indigo-500/50" :
                "bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
            )}>
                <div className="flex items-center justify-between w-full">
                    <div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded",
                            block.block_type === 'Deep Work' ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" :
                            block.block_type === 'Transit' ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                            "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        )}>{block.block_type}</span>
                        <h3 className={cn("text-lg font-black leading-tight mt-2", block.is_completed ? "text-emerald-700 dark:text-emerald-500 line-through" : "text-slate-900 dark:text-white")}>{block.title}</h3>
                    </div>
                    
                    <div className="flex gap-2">
                        {block.block_type === 'Deep Work' && !block.is_completed && (
                            <a href={`/flow?taskId=${block.linked_task_id}&duration=${timeToMinutes(block.end_time) - timeToMinutes(block.start_time)}`} className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Play size={18} fill="currentColor"/></a>
                        )}
                        {!block.is_completed && (
                            <button onClick={() => onComplete(block.id, block.linked_task_id || undefined)} className="p-3 bg-slate-100 dark:bg-slate-800 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><CheckCircle2 size={18}/></button>
                        )}
                        <button onClick={() => onEdit(block)} className="p-3 text-slate-400 hover:bg-blue-50 hover:text-blue-500 rounded-xl transition-all"><Pencil size={18}/></button>
                        <button onClick={() => onDelete(block.id)} className="p-3 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                </div>

                {/* 🎯 NEW: LIVE PROGRESS BAR FOR ACTIVE BLOCKS */}
                {isActive && (
                    <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-500/20 w-full animate-in slide-in-from-top-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">
                            <span className="flex items-center gap-1"><Activity size={12} className="animate-pulse"/> IN PROGRESS</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-indigo-500" initial={{ width: "0%" }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Main Engine ---
export default function ChronoMap() {
    const [isMounted, setIsMounted] = useState(false) 
    const [blocks, setBlocks] = useState<TimeBlock[]>([])
    const [unscheduledTasks, setUnscheduledTasks] = useState<OS_Task[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    
    // Core Modals
    const [isAdding, setIsAdding] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newStart, setNewStart] = useState('08:00')
    const [newEnd, setNewEnd] = useState('09:00')
    const [newType, setNewType] = useState<'Routine' | 'Deep Work' | 'Transit'>('Routine')
    
    const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)

    // SVG Curve State
    const [pathData, setPathData] = useState("")
    const [indicatorY, setIndicatorY] = useState(-100) 
    const containerRef = useRef<HTMLDivElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    )

    useEffect(() => {
        setIsMounted(true)
        fetchChronoData()
        const timer = setInterval(() => setCurrentTime(new Date()), 10000) // Updated to 10s for smoother progress bars
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (!isMounted) return;
        const calculatePhysics = () => {
            if (!containerRef.current) return;
            const nodes = containerRef.current.querySelectorAll('.node-element');
            if (nodes.length < 2) { setPathData(""); return; }

            const containerRect = containerRef.current.getBoundingClientRect();
            let newPath = "";
            let targetY = -100; 
            const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

            // 1. Draw the SVG Connecting Curves
            nodes.forEach((node, i) => {
                const icon = node.querySelector('.rounded-full');
                if (!icon) return;
                const rect = icon.getBoundingClientRect();
                const x = rect.left - containerRect.left + (rect.width / 2);
                const y = rect.top - containerRect.top + (rect.height / 2);

                if (i === 0) newPath += `M ${x} ${y}`;
                else {
                    const prevNode = nodes[i - 1];
                    const prevIcon = prevNode.querySelector('.rounded-full');
                    if (prevIcon) {
                        const prevRect = prevIcon.getBoundingClientRect();
                        const prevX = prevRect.left - containerRect.left + (prevRect.width / 2);
                        const prevY = prevRect.top - containerRect.top + (prevRect.height / 2);
                        newPath += ` C ${prevX} ${prevY + 50}, ${x} ${y - 50}, ${x} ${y}`;
                    }
                }
            });
            setPathData(newPath);

            // 2. Calculate Tracker Position accurately
            if (blocks.length > 0) {
                let foundPosition = false;
                for (let i = 0; i < blocks.length; i++) {
                    const startMins = timeToMinutes(blocks[i].start_time);
                    const endMins = timeToMinutes(blocks[i].end_time);
                    const nodeRect = nodes[i].getBoundingClientRect();
                    const yTop = nodeRect.top - containerRect.top;
                    const yBottom = nodeRect.bottom - containerRect.top;

                    if (currentMins >= startMins && currentMins <= endMins) {
                        const progress = (currentMins - startMins) / (endMins - startMins);
                        targetY = yTop + (yBottom - yTop) * progress;
                        foundPosition = true;
                        break;
                    } else if (currentMins < startMins) {
                        if (i === 0) {
                            targetY = yTop - 30; 
                        } else {
                            const prevEndMins = timeToMinutes(blocks[i-1].end_time);
                            const prevNodeRect = nodes[i-1].getBoundingClientRect();
                            const yPrevBottom = prevNodeRect.bottom - containerRect.top;
                            const progress = (currentMins - prevEndMins) / (startMins - prevEndMins);
                            targetY = yPrevBottom + (yTop - yPrevBottom) * progress;
                        }
                        foundPosition = true;
                        break;
                    }
                }
                
                if (!foundPosition) {
                    const lastNodeRect = nodes[nodes.length - 1].getBoundingClientRect();
                    targetY = lastNodeRect.bottom - containerRect.top + 30;
                }
                setIndicatorY(targetY);
            }
        }
        
        setTimeout(calculatePhysics, 100);
        window.addEventListener('resize', calculatePhysics);
        return () => window.removeEventListener('resize', calculatePhysics);
    }, [blocks, isMounted, currentTime])

    const fetchChronoData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const today = new Date().toISOString().split('T')[0]

        const { data: bData } = await supabase.from('time_blocks').select('*').eq('user_id', user.id).eq('date', today).order('start_time', { ascending: true })
        if (bData) setBlocks(bData)

        const { data: tData, error } = await supabase.from('tasks').select('*').eq('user_id', user.id)
        if (tData) {
            const activeTasks = tData.filter(t => t.last_completed_at !== today && t.type !== 'Goal' && t.status !== 'completed')
            const mappedIds = bData?.map(b => b.linked_task_id?.toString()).filter(Boolean) || []
            setUnscheduledTasks(activeTasks.filter(t => !mappedIds.includes(t.id.toString())))
        } else if (error) { console.error("Task Fetch Error:", error) }
        setIsLoading(false)
    }

    const addManualBlock = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTitle.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const newBlock = { user_id: user.id, title: newTitle, start_time: newStart, end_time: newEnd, block_type: newType, date: new Date().toISOString().split('T')[0] }
        try {
            const { data, error } = await supabase.from('time_blocks').insert([newBlock]).select()
            if (error) throw error;
            if (data) setBlocks([...blocks, data[0]].sort((a, b) => a.start_time.localeCompare(b.start_time)))
            setIsAdding(false); setNewTitle('');
        } catch (error) { alert("Database Error.") }
    }

    const addMissionToTimeline = async (task: OS_Task) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const now = new Date(); const end = new Date(now.getTime() + 60 * 60000)
        const newBlock = {
            user_id: user.id, title: task.title, block_type: 'Deep Work', linked_task_id: task.id,
            start_time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
            end_time: `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`,
            date: new Date().toISOString().split('T')[0]
        }
        const { data, error } = await supabase.from('time_blocks').insert([newBlock]).select()
        if (data) {
            setBlocks([...blocks, data[0]].sort((a, b) => a.start_time.localeCompare(b.start_time)))
            setUnscheduledTasks(unscheduledTasks.filter(t => t.id !== task.id))
        } else if (error) { alert("Database Error.") }
    }

    const deleteBlock = async (id: string) => {
        await supabase.from('time_blocks').delete().eq('id', id)
        setBlocks(blocks.filter(b => b.id !== id))
        fetchChronoData() 
    }

    const completeBlock = async (id: string, taskId?: string) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, is_completed: true } : b))
        await supabase.from('time_blocks').update({ is_completed: true }).eq('id', id)
        if (taskId) {
            const today = new Date().toISOString().split('T')[0]
            await supabase.from('tasks').update({ status: 'completed', last_completed_at: today }).eq('id', taskId)
            fetchChronoData()
        }
    }

    const submitEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingBlock) return
        try {
            const { data, error } = await supabase.from('time_blocks').update({ title: editingBlock.title, start_time: editingBlock.start_time, end_time: editingBlock.end_time }).eq('id', editingBlock.id).select()
            if (error) throw error;
            if (data) {
                setBlocks(blocks.map(b => b.id === editingBlock.id ? data[0] : b).sort((a, b) => a.start_time.localeCompare(b.start_time)))
                setEditingBlock(null)
            }
        } catch (err) { alert("Failed to secure updated coordinates.") }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setBlocks((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    if (!isMounted) return <div className="h-screen flex items-center justify-center text-indigo-500"><Activity className="animate-pulse" size={48}/></div>

    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const liveTimeFormat = formatTime(`${String(currentTime.getHours()).padStart(2,'0')}:${String(currentTime.getMinutes()).padStart(2,'0')}`);

    return (
        <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
            <header className="mb-12 mt-4 border-b border-slate-200 dark:border-slate-800 pb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight"><MapIcon className="text-indigo-600 dark:text-indigo-400" size={32} /> Chrono Map</h1>
                    <p className="text-slate-500 font-bold mt-3 text-sm tracking-wide uppercase">Kinetic Day Visualization</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* THE TIMELINE ENGINE */}
                <div className="lg:col-span-8 relative" ref={containerRef}>
                    
                    {/* SVG Transit Line */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                        <path d={pathData} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-800 transition-all duration-500" strokeDasharray="8 8" strokeLinecap="round" />
                    </svg>

                    {/* 🎯 THE OVERHAULED: Structural Time Indicator (No Overlaps) */}
                    {blocks.length > 0 && indicatorY > 0 && (
                        <motion.div 
                            className="absolute left-0 w-full z-[5] pointer-events-none flex items-center gap-4 md:gap-8"
                            animate={{ top: indicatorY }}
                            transition={{ type: "spring", stiffness: 40, damping: 20 }}
                            style={{ marginTop: '-1px' }} // Center exactly on Y axis
                        >
                            {/* LIVE TIME BADGE (Matches the w-24 left column perfectly) */}
                            <div className="w-24 text-right shrink-0">
                                <span className="text-[10px] md:text-xs font-black tracking-widest text-indigo-500 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/50 px-2 py-1 rounded shadow-sm inline-flex items-center gap-1 animate-pulse">
                                    <Clock size={10} /> {liveTimeFormat}
                                </span>
                            </div>

                            {/* GLOWING DOT & LINE AREA */}
                            <div className="flex-1 flex items-center relative h-0.5">
                                {/* The Dot (Centered identically to the node circles w-14) */}
                                <div className="w-14 shrink-0 flex items-center justify-center relative">
                                    <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,1)] animate-ping absolute" />
                                    <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,1)] relative z-10" />
                                </div>
                                {/* Fading line behind the cards */}
                                <div className="flex-1 h-full bg-gradient-to-r from-indigo-500/60 to-transparent" />
                            </div>
                        </motion.div>
                    )}

                    {blocks.length === 0 && !isLoading && (
                        <div className="text-center py-32 opacity-50 relative z-10 bg-slate-50 dark:bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-700">
                            <CircleDot size={48} className="mx-auto mb-4 text-slate-400" />
                            <p className="font-bold text-slate-500 uppercase tracking-widest">Timeline Empty. Map your day.</p>
                        </div>
                    )}

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-8 relative py-4">
                                {blocks.map((block) => {
                                    const startMins = timeToMinutes(block.start_time);
                                    const endMins = timeToMinutes(block.end_time);
                                    const isActive = currentMins >= startMins && currentMins <= endMins && !block.is_completed;
                                    const isPast = currentMins > endMins && !block.is_completed;
                                    const progress = isActive ? ((currentMins - startMins) / (endMins - startMins)) * 100 : 0;

                                    return <SortableNode key={block.id} block={block} isActive={isActive} isPast={isPast} progress={progress} onDelete={deleteBlock} onComplete={completeBlock} onEdit={setEditingBlock} />
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* THE MISSION DOCK */}
                <div className="lg:col-span-4">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl sticky top-8 border border-slate-800">
                        <h3 className="font-black text-xl mb-2 flex items-center gap-2"><Briefcase className="text-indigo-400"/> Unscheduled Missions</h3>
                        <p className="text-slate-400 text-sm font-medium mb-6">Click an active dashboard task to drop it onto your timeline.</p>
                        
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {unscheduledTasks.length === 0 && !isLoading ? (
                                <p className="text-emerald-400 font-bold text-sm bg-emerald-900/20 p-4 rounded-xl text-center border border-emerald-900/50">All OS Missions Assigned.</p>
                            ) : (
                                unscheduledTasks.map(task => (
                                    <button key={task.id} onClick={() => addMissionToTimeline(task)} className="w-full text-left bg-slate-800 hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] p-4 rounded-2xl transition-all group border border-slate-700 hover:border-indigo-400">
                                        <h4 className="font-bold text-sm mb-1">{task.title}</h4>
                                        <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-indigo-200 flex items-center gap-1"><Plus size={12}/> Deploy to Timeline</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-800">
                            <h3 className="font-black text-sm text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Dumbbell size={16}/> Map Physical Routine</h3>
                            {isAdding ? (
                                <form onSubmit={addManualBlock} className="space-y-3 animate-in fade-in">
                                    <div className="flex bg-slate-800 p-1 rounded-xl">
                                        <button type="button" onClick={() => setNewType('Routine')} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", newType === 'Routine' ? "bg-emerald-600 text-white" : "text-slate-400")}>Routine</button>
                                        <button type="button" onClick={() => setNewType('Transit')} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", newType === 'Transit' ? "bg-amber-600 text-white" : "text-slate-400")}>Transit</button>
                                    </div>
                                    <input type="text" placeholder="e.g. Strength Training" value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none" required/>
                                    <div className="flex gap-2">
                                        <input type="time" value={newStart} onChange={e=>setNewStart(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-3 text-xs font-bold text-white outline-none" required/>
                                        <input type="time" value={newEnd} onChange={e=>setNewEnd(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-3 text-xs font-bold text-white outline-none" required/>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button type="button" onClick={() => setIsAdding(false)} className="flex-1 text-slate-400 text-xs font-bold hover:text-white">Cancel</button>
                                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-colors">Add</button>
                                    </div>
                                </form>
                            ) : (
                                <button onClick={() => setIsAdding(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                                    <Plus size={18} /> Add Routine Block
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* NODE EDITOR MODAL */}
            {editingBlock && (
                <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setEditingBlock(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2"><Pencil size={18}/> Adjust Coordinates</h3>
                        <form onSubmit={submitEdit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Title</label>
                                <input type="text" value={editingBlock.title} onChange={e => setEditingBlock({...editingBlock, title: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Start Time</label>
                                    <input type="time" value={editingBlock.start_time} onChange={e => setEditingBlock({...editingBlock, start_time: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">End Time</label>
                                    <input type="time" value={editingBlock.end_time} onChange={e => setEditingBlock({...editingBlock, end_time: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500" required />
                                </div>
                            </div>
                            <button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"><Save size={18}/> Save Node</button>
                        </form>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.2); border-radius: 20px; }`}} />
        </div>
    )
}