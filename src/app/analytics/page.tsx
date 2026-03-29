'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BarChart2, Brain, Zap, TrendingUp, BookOpen, Target } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface VocabData {
  id: number; word_type?: string; gender?: string; repetition: number; created_at: string;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  
  // Data States
  const [totalWords, setTotalWords] = useState(0)
  const [masteryData, setMasteryData] = useState<any[]>([])
  const [typeData, setTypeData] = useState<any[]>([])
  const [genderData, setGenderData] = useState({ der: 0, die: 0, das: 0 })
  const [dueToday, setDueToday] = useState(0)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch from both databases
    const [enRes, deRes] = await Promise.all([
        supabase.from('vocabulary').select('repetition, created_at, next_review').eq('user_id', user.id),
        supabase.from('german_vocabulary').select('word_type, gender, repetition, created_at, next_review').eq('user_id', user.id)
    ])

    const enWords = enRes.data || []
    const deWords = deRes.data || []
    const allWords = [...enWords, ...deWords]

    setTotalWords(allWords.length)

    // 2. Calculate SM-2 Mastery Levels
    // Repetition 0 = New, 1-3 = Learning, 4+ = Mastered
    let newWords = 0, learning = 0, mastered = 0;
    let due = 0;
    const today = new Date().toISOString()

    allWords.forEach(w => {
        if (w.repetition === 0) newWords++;
        else if (w.repetition < 4) learning++;
        else mastered++;

        if (w.next_review && w.next_review <= today) due++;
    })

    setMasteryData([
        { name: 'New (0 Reps)', value: newWords, color: '#94a3b8' }, // Slate 400
        { name: 'Learning (1-3 Reps)', value: learning, color: '#6366f1' }, // Indigo 500
        { name: 'Mastered (4+ Reps)', value: mastered, color: '#10b981' } // Emerald 500
    ])
    setDueToday(due)

    // 3. Calculate German Word Types
    const types: Record<string, number> = { Noun: 0, Verb: 0, Adjective: 0, Other: 0 }
    let derCount = 0, dieCount = 0, dasCount = 0;

    deWords.forEach(w => {
        if (w.word_type) {
            if (types[w.word_type] !== undefined) types[w.word_type]++;
            else types['Other']++;
        }
        if (w.gender === 'der') derCount++;
        if (w.gender === 'die') dieCount++;
        if (w.gender === 'das') dasCount++;
    })

    setTypeData([
        { name: 'Nouns', value: types.Noun, color: '#3b82f6' },
        { name: 'Verbs', value: types.Verb, color: '#10b981' },
        { name: 'Adjectives', value: types.Adjective, color: '#a855f7' },
        { name: 'Other', value: types.Other, color: '#f59e0b' }
    ].filter(d => d.value > 0)) // Only show types that have words

    setGenderData({ der: derCount, die: dieCount, das: dasCount })
    
    setLoading(false)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
          <p className="text-white font-bold">{`${payload[0].name} : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  }

  if (loading) return <div className="py-20 text-center text-slate-500 animate-pulse">Compiling Analytics Data...</div>

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in duration-500 px-4 md:px-8">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BarChart2 className="text-indigo-600" size={36} /> Analytics
          </h1>
          <p className="text-slate-500 font-medium mt-2">Neural network capacity and retention metrics.</p>
        </div>
        <button onClick={fetchAnalytics} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm flex items-center justify-center gap-2">
            <TrendingUp size={18} /> Refresh Data
        </button>
      </header>

      {/* TOP METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                  <BookOpen size={28} />
              </div>
              <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Vault</p>
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white">{totalWords}</h3>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                  <Brain size={28} />
              </div>
              <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Mastered Words</p>
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white">
                      {masteryData.find(d => d.name.includes('Mastered'))?.value || 0}
                  </h3>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
                  <Target size={28} />
              </div>
              <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Reviews Due Today</p>
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white">{dueToday}</h3>
              </div>
          </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* SM-2 MASTERY PIPELINE */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-8">
                  <Zap className="text-indigo-500" /> SM-2 Retention Pipeline
              </h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={masteryData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} className="text-xs font-bold fill-slate-500" width={140} />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                              {masteryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* GERMAN WORD TYPES */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">German Lexicon Breakdown</h3>
              <p className="text-sm text-slate-500 font-medium mb-4">Distribution of parts of speech in your active vault.</p>
              <div className="h-[260px] w-full flex items-center justify-center">
                  {typeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={typeData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                                  {typeData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }} />
                          </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <p className="text-slate-400 italic font-medium">No German vocabulary logged yet.</p>
                  )}
              </div>
          </div>
      </div>

      {/* THE GENDER TRACKER BAR */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Noun Gender Balance</h3>
          
          {genderData.der + genderData.die + genderData.das > 0 ? (
              <div>
                  <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-blue-500">Der (M): {genderData.der}</span>
                      <span className="text-red-500">Die (F): {genderData.die}</span>
                      <span className="text-emerald-500">Das (N): {genderData.das}</span>
                  </div>
                  
                  {/* Visual Proportion Bar */}
                  <div className="w-full h-6 rounded-full overflow-hidden flex shadow-inner">
                      <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(genderData.der / (genderData.der + genderData.die + genderData.das)) * 100}%` }} />
                      <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${(genderData.die / (genderData.der + genderData.die + genderData.das)) * 100}%` }} />
                      <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(genderData.das / (genderData.der + genderData.die + genderData.das)) * 100}%` }} />
                  </div>
              </div>
          ) : (
              <p className="text-slate-400 italic font-medium text-center py-4">No German nouns logged yet.</p>
          )}
      </div>

    </div>
  )
}