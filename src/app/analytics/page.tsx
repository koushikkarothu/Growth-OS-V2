'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import { subDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { Loader2, TrendingUp, Activity, PieChart as PieIcon, Flame, Award, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLORS = ['#4f46e5', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6']

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activityData, setActivityData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [habitMatrix, setHabitMatrix] = useState<any[]>([])
  const [streakData, setStreakData] = useState<any[]>([]) // <--- NEW
  const [dates, setDates] = useState<Date[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push('/login'); return }
      fetchData()
    }
    init()
  }, [])

  async function fetchData() {
    const today = new Date()
    // Fetch all active tasks to get current streaks
    const { data: tasks } = await supabase.from('tasks').select('*')
    if (!tasks) { setLoading(false); return }

    // 1. STREAK LEADERBOARD DATA
    // Filter only tasks with streaks > 0 and sort by highest streak
    const activeStreaks = tasks
      .filter((t: any) => t.current_streak > 0 && t.type !== 'Goal')
      .sort((a: any, b: any) => b.current_streak - a.current_streak)
    setStreakData(activeStreaks)

    // 2. ACTIVITY PULSE DATA
    const { data: logs } = await supabase.from('task_logs').select('date')
      .gte('date', subDays(today, 14).toISOString())
    
    const activityMap = new Map()
    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i); activityMap.set(format(d, 'yyyy-MM-dd'), { day: format(d, 'MMM dd'), count: 0 })
    }
    logs?.forEach((log: any) => { if (activityMap.has(log.date)) activityMap.get(log.date).count += 1 })
    setActivityData(Array.from(activityMap.values()))

    // 3. CATEGORY PIE DATA
    const categoryMap: any = {}
    tasks.forEach((task: any) => { categoryMap[task.category] = (categoryMap[task.category] || 0) + 1 })
    setCategoryData(Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] })))

    // 4. HABIT MATRIX DATA
    setDates(eachDayOfInterval({ start: subDays(today, 6), end: today }))
    // We need logs for the matrix specifically
    const { data: matrixLogs } = await supabase.from('task_logs').select('*')
      .gte('date', subDays(today, 7).toISOString())
    
    // Attach logs to habits for the matrix render
    const matrixHabits = tasks.filter((t: any) => t.frequency_goal > 0).map((t: any) => ({
      ...t,
      logs: matrixLogs?.filter((l: any) => l.task_id === t.id)
    }))
    setHabitMatrix(matrixHabits)

    setLoading(false)
  }
  // Add this inside your component, before return:
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

if (!mounted) return <div className="p-20 text-center">Loading Charts...</div>

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Analytics</h1>
        <p className="text-slate-500 font-medium">Measure your progress. Optimize your systems.</p>
      </header>

      {loading && <Loader2 className="animate-spin text-indigo-600 mx-auto" size={40} />}

      {!loading && (
        <div className="space-y-8">
          
          {/* --- SECTION 1: STREAK LEADERBOARD (NEW) --- */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-500"><Flame size={20} fill="currentColor" /></div>
              <h2 className="text-xl font-bold text-slate-900">Consistency Leaderboard</h2>
            </div>
            
            {streakData.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400">
                No active streaks yet. Complete a habit to start the fire! 🔥
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {streakData.map((task, index) => {
                  // Special styling for Top 3
                  const isGold = index === 0;
                  const isSilver = index === 1;
                  const isBronze = index === 2;
                  
                  return (
                    <div key={task.id} className={cn(
                      "relative bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md",
                      isGold ? "border-amber-200 bg-amber-50/30" : 
                      isSilver ? "border-slate-300 bg-slate-50/50" : 
                      isBronze ? "border-orange-200 bg-orange-50/30" : "border-slate-200"
                    )}>
                      {/* Rank Badge */}
                      <div className="flex justify-between items-start mb-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                          isGold ? "bg-amber-100 text-amber-700" :
                          isSilver ? "bg-slate-200 text-slate-600" :
                          isBronze ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400"
                        )}>
                          #{index + 1}
                        </div>
                        <div className="flex items-center gap-1 text-orange-500 font-bold">
                          <Flame size={16} fill="currentColor" />
                          <span>{task.current_streak}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 truncate mb-1">{task.title}</h3>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                         {task.frequency_goal === 7 ? 'Daily Streak' : 'Weekly Streak'}
                      </p>

                      {/* Progress Bar Visual for fun */}
                      <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", isGold ? "bg-amber-400" : "bg-indigo-500")} 
                          style={{ width: '100%' }} // Full streak bar
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ACTIVITY CHART */}
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-8">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Activity size={20} /></div>
                <h2 className="text-lg font-bold text-slate-900">Activity Pulse</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData}>
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PIE CHART */}
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-8">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><PieIcon size={20} /></div>
                <h2 className="text-lg font-bold text-slate-900">Focus Distribution</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* HABIT MATRIX */}
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm overflow-x-auto">
            <div className="flex items-center gap-2 mb-8">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><TrendingUp size={20} /></div>
              <h2 className="text-lg font-bold text-slate-900">Habit Matrix (Last 7 Days)</h2>
            </div>
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 text-xs font-bold uppercase tracking-wider pb-4">Habit</th>
                  {dates.map(date => <th key={date.toString()} className="text-center text-slate-400 text-xs font-bold uppercase tracking-wider pb-4">{format(date, 'EEE')}</th>)}
                </tr>
              </thead>
              <tbody className="space-y-2">
                {habitMatrix.map((habit) => (
                  <tr key={habit.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-700 flex items-center gap-2">
                       {habit.title}
                       {habit.current_streak > 3 && <Flame size={12} className="text-orange-500" fill="currentColor" />}
                    </td>
                    {dates.map(date => {
                       const dateStr = format(date, 'yyyy-MM-dd')
                       // Check if any log exists for this task on this date
                       const isDone = habit.logs?.some((l: any) => l.date === dateStr)
                       return (
                        <td key={date.toString()} className="text-center">
                          <div className={cn(
                            "w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all",
                            isDone ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-110" : "bg-slate-100 text-slate-300"
                          )}>
                             {isDone && <TrendingUp size={14} />}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}