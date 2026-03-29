'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BarChart2, Brain, Zap, BookOpen, Target, Flame, CheckSquare, Activity, RefreshCcw, Calendar, Crosshair } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  
  // Vocabulary Data States
  const [totalWords, setTotalWords] = useState(0)
  const [masteryData, setMasteryData] = useState<any[]>([])
  const [typeData, setTypeData] = useState<any[]>([])
  const [genderData, setGenderData] = useState({ der: 0, die: 0, das: 0 })
  const [dueToday, setDueToday] = useState(0)
  const [memoryStrength, setMemoryStrength] = useState(0)

  // Productivity Data States
  const [activeStreak, setActiveStreak] = useState(0)
  const [tasksCompleted, setTasksCompleted] = useState(0)
  const [weeklyTaskCount, setWeeklyTaskCount] = useState(0)
  const [activityData, setActivityData] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])

  useEffect(() => { fetchAnalytics() }, [timeRange])

  const getLocalYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  async function fetchAnalytics() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. LINGUISTIC TELEMETRY
    const [enRes, deRes] = await Promise.all([
        supabase.from('vocabulary').select('repetition, created_at, next_review, efactor').eq('user_id', user.id),
        supabase.from('german_vocabulary').select('word_type, gender, repetition, created_at, next_review, efactor').eq('user_id', user.id)
    ])

    const enWords = enRes.data || []
    const deWords = deRes.data || []
    const allWords = [...enWords, ...deWords]
    setTotalWords(allWords.length)

    let newWords = 0, learning = 0, mastered = 0, due = 0, totalEfactor = 0, reviewedCards = 0;
    const today = new Date().toISOString()

    allWords.forEach(w => {
        if (w.repetition === 0) newWords++;
        else if (w.repetition < 4) learning++;
        else mastered++;
        
        if (w.next_review && w.next_review <= today) due++;
        if (w.repetition > 0 && w.efactor) { totalEfactor += w.efactor; reviewedCards++; }
    })

    if (reviewedCards > 0) {
        const avgEfactor = totalEfactor / reviewedCards;
        setMemoryStrength(Math.min(100, Math.max(0, Math.round(((avgEfactor - 1.3) / 1.5) * 100))));
    } else setMemoryStrength(0)

    setMasteryData([
        { name: 'New (0 Reps)', value: newWords, color: '#64748b' },
        { name: 'Learning (1-3)', value: learning, color: '#3b82f6' },
        { name: 'Mastered (4+)', value: mastered, color: '#10b981' }
    ])
    setDueToday(due)

    const types: Record<string, number> = { Noun: 0, Verb: 0, Adjective: 0, Adverb: 0, Other: 0 }
    let derCount = 0, dieCount = 0, dasCount = 0;
    deWords.forEach(w => {
        if (w.word_type) { if (types[w.word_type] !== undefined) types[w.word_type]++; else types['Other']++; }
        if (w.gender === 'der') derCount++; if (w.gender === 'die') dieCount++; if (w.gender === 'das') dasCount++;
    })

    setTypeData([
        { name: 'Nouns', value: types.Noun, color: '#3b82f6' },
        { name: 'Verbs', value: types.Verb, color: '#10b981' },
        { name: 'Adjectives', value: types.Adjective, color: '#8b5cf6' },
        { name: 'Adverbs', value: types.Adverb, color: '#f59e0b' },
        { name: 'Other', value: types.Other, color: '#64748b' }
    ].filter(d => d.value > 0))
    setGenderData({ der: derCount, die: dieCount, das: dasCount })

    // 2. PRODUCTIVITY TELEMETRY
    const { count: totalTasksCount } = await supabase.from('task_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    setTasksCompleted(totalTasksCount || 0);

    const { data: allDatesData } = await supabase.from('task_logs').select('date').eq('user_id', user.id).order('date', { ascending: false });
    let calculatedStreak = 0;
    if (allDatesData && allDatesData.length > 0) {
        const uniqueDates = [...new Set(allDatesData.map(log => log.date))];
        let checkDate = new Date();
        let dateStr = getLocalYYYYMMDD(checkDate);
        if (!uniqueDates.includes(dateStr)) { checkDate.setDate(checkDate.getDate() - 1); dateStr = getLocalYYYYMMDD(checkDate); }
        while (uniqueDates.includes(dateStr)) { calculatedStreak++; checkDate.setDate(checkDate.getDate() - 1); dateStr = getLocalYYYYMMDD(checkDate); }
    }
    setActiveStreak(calculatedStreak);

    const daysToFetch = timeRange === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (daysToFetch - 1));
    const { data: recentLogs } = await supabase.from('task_logs').select('date, duration_minutes').eq('user_id', user.id).gte('date', getLocalYYYYMMDD(startDate));

    const chartData = []; const heatData = [];
    let recentTasksCount = 0; let maxTasksInADay = 1;

    for (let i = daysToFetch - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = getLocalYYYYMMDD(d);
        const dayLogs = recentLogs?.filter(l => l.date === dateStr) || [];
        const tasks = dayLogs.length;
        if (i < 7) recentTasksCount += tasks; 
        if (tasks > maxTasksInADay) maxTasksInADay = tasks;
        const focusMinutes = dayLogs.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        chartData.push({ name: timeRange === '7d' ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.getDate(), fullDate: dateStr, tasks: tasks, focus: Number((focusMinutes / 60).toFixed(1)) });
    }
    
    for(let i = 27; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = getLocalYYYYMMDD(d);
        const dayLogs = recentLogs?.filter(l => l.date === dateStr) || [];
        heatData.push({ date: dateStr, tasks: dayLogs.length });
    }

    setActivityData(chartData);
    setHeatmapData(heatData.map(h => ({ ...h, intensity: h.tasks === 0 ? 0 : Math.max(0.2, h.tasks / maxTasksInADay) })));
    setWeeklyTaskCount(recentTasksCount);
    setTimeout(() => setLoading(false), 300)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900/90 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
          {label && <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">{label}</p>}
          {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                     <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">{entry.name}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-black text-sm">{entry.value}</span>
              </div>
          ))}
        </div>
      );
    }
    return null;
  }

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-[70vh] text-indigo-500 animate-pulse space-y-6">
              <div className="relative"><div className="absolute inset-0 blur-xl bg-indigo-500/30 rounded-full"></div><Activity size={50} className="relative z-10" /></div>
              <p className="font-black tracking-widest uppercase text-xs text-slate-500">Syncing Telemetry...</p>
          </div>
      )
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-32 animate-in fade-in duration-700 px-4 md:px-8">
      
      {/* ⚡ HEADER ⚡ */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 mt-4 border-b border-slate-200 dark:border-slate-800/50 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-slate-400 flex items-center gap-4 tracking-tight">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20"><BarChart2 className="text-indigo-600 dark:text-indigo-400" size={32} /></div>
             Command Center
          </h1>
          <p className="text-slate-500 font-bold mt-3 text-sm tracking-wide">SYSTEM-WIDE PERFORMANCE & NEURAL RETENTION METRICS</p>
        </div>
        <button onClick={() => {setLoading(true); fetchAnalytics()}} className="bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm dark:backdrop-blur-md">
            <RefreshCcw size={16} className="text-indigo-600 dark:text-indigo-400" /> Force Sync
        </button>
      </header>

      {/* ⚡ THE BENTO BOX GRID ⚡ */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6">

          {/* KPI 1: Active Streak */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 text-orange-500/5 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700"><Flame size={150} /></div>
              <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center border border-orange-200 dark:border-orange-500/20"><Flame size={20} /></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">Live</span>
                  </div>
                  <h3 className="text-5xl font-black text-slate-900 dark:text-white mb-1">{activeStreak}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Day Streak</p>
              </div>
          </div>

          {/* KPI 2: Total Tasks */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 text-emerald-500/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700"><CheckSquare size={150} /></div>
              <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20"><CheckSquare size={20} /></div>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-md">+{weeklyTaskCount} 7D</span>
                  </div>
                  <h3 className="text-5xl font-black text-slate-900 dark:text-white mb-1">{tasksCompleted}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tasks Cleared</p>
              </div>
          </div>

          {/* KPI 3: Lexicon Vault */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 text-blue-500/5 group-hover:scale-110 transition-all duration-700"><BookOpen size={150} /></div>
              <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-500/20"><BookOpen size={20} /></div>
                  </div>
                  <h3 className="text-5xl font-black text-slate-900 dark:text-white mb-1">{totalWords}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Secured Words</p>
              </div>
          </div>

          {/* KPI 4: Reviews Due (Always pop with color) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-indigo-600 dark:bg-gradient-to-br dark:from-indigo-900 dark:to-indigo-950 p-6 rounded-[2rem] border border-indigo-500 dark:border-indigo-500/30 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 text-white/10 group-hover:scale-110 transition-all duration-700"><Zap size={150} /></div>
              <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                      <div className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/30"><Zap size={20} /></div>
                      {dueToday > 0 && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                  </div>
                  <h3 className="text-5xl font-black text-white mb-1">{dueToday}</h3>
                  <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Reviews Due</p>
              </div>
          </div>

          {/* MAIN AREA CHART: Productivity Pulse */}
          <div className="col-span-1 lg:col-span-8 bg-white dark:bg-slate-900/50 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <Activity className="text-indigo-600 dark:text-indigo-400" size={20} /> Productivity Pulse
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Deep Work & Task Velocity</p>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl w-fit">
                      <button onClick={() => setTimeRange('7d')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all", timeRange === '7d' ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-white")}>7 Days</button>
                      <button onClick={() => setTimeRange('30d')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all", timeRange === '30d' ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-white")}>30 Days</button>
                  </div>
              </div>
              
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          {/* Use a stroke color that works in both modes */}
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.5} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} dy={10} minTickGap={15} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }} />
                          <Area type="monotone" name="Tasks Cleared" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                          <Area type="monotone" name="Focus (Hrs)" dataKey="focus" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFocus)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* SIDE PANEL: Heatmap & Neural Strength */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
              
              {/* Neural Strength Gauge */}
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl flex-1 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-100 dark:bg-indigo-500/10 blur-3xl rounded-full"></div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                      <Brain className="text-purple-500 dark:text-purple-400" size={16} /> Neural Strength
                  </h3>
                  <div className="flex items-center gap-6">
                      <div className="relative w-24 h-24 shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-purple-600 dark:text-purple-500 transition-all duration-1000 ease-out" strokeDasharray={`${memoryStrength}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                              <span className="text-2xl font-black text-slate-900 dark:text-white">{memoryStrength}%</span>
                          </div>
                      </div>
                      <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">Derived from SM-2 E-Factor. A score above 80% indicates highly robust long-term retention.</p>
                      </div>
                  </div>
              </div>

              {/* 28-Day Activity Heatmap */}
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Calendar className="text-emerald-600 dark:text-emerald-400" size={16} /> 28-Day Grid
                  </h3>
                  <div className="grid grid-cols-7 gap-1.5">
                      {heatmapData.map((day, idx) => (
                          <div 
                              key={idx} 
                              title={`${day.date}: ${day.tasks} tasks`}
                              className={cn(
                                  "w-full aspect-square rounded-[4px] transition-all duration-300",
                                  day.intensity === 0 ? "bg-slate-100 dark:bg-slate-800/50" : "bg-emerald-500 dark:shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              )}
                              style={{ opacity: day.intensity === 0 ? 1 : day.intensity }}
                          />
                      ))}
                  </div>
              </div>
          </div>

          {/* SM-2 MASTERY PIPELINE */}
          <div className="col-span-1 lg:col-span-7 bg-white dark:bg-slate-900/50 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl flex flex-col">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                  <Target className="text-blue-500 dark:text-blue-400" size={20} /> Algorithm Progression
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-8">Lexicon Mastery Pipeline</p>
              
              <div className="flex-1 min-h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={masteryData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} width={140} />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(100,116,139,0.05)'}} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                              {masteryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* GERMAN LEXICON DONUT & GENDER BARS */}
          <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl flex-1 flex items-center">
                  <div className="w-1/2 flex flex-col justify-center">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Lexicon Matrix</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-4">Vocabulary Distribution</p>
                      
                      <div className="space-y-3">
                          {typeData.map((type, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }}></div>
                                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{type.name}</span>
                                  </div>
                                  <span className="text-xs font-black text-slate-900 dark:text-white">{type.value}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="w-1/2 h-[160px]">
                      {typeData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" stroke="none">
                                      {typeData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="h-full flex items-center justify-center"><BookOpen className="text-slate-300 dark:text-slate-700" size={32} /></div>
                      )}
                  </div>
              </div>

              {/* Minimal Gender Tracker */}
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                          <Crosshair className="text-slate-500 dark:text-slate-400" size={16} /> Gender Bias
                      </h3>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-blue-600 dark:text-blue-400">Der ({genderData.der})</span>
                      <span className="text-red-600 dark:text-red-400">Die ({genderData.die})</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Das ({genderData.das})</span>
                  </div>
                  {genderData.der + genderData.die + genderData.das > 0 ? (
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                          <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(genderData.der / (genderData.der + genderData.die + genderData.das)) * 100}%` }} />
                          <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${(genderData.die / (genderData.der + genderData.die + genderData.das)) * 100}%` }} />
                          <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(genderData.das / (genderData.der + genderData.die + genderData.das)) * 100}%` }} />
                      </div>
                  ) : (
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                  )}
              </div>
          </div>

      </div>
    </div>
  )
}