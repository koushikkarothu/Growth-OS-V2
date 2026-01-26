'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // Toggle between Login/Sign Up
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        // --- SIGN UP LOGIC ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage({ text: 'Check your email for the confirmation link!', type: 'success' })
      } else {
        // --- SIGN IN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // On success, redirect to Dashboard
        router.push('/')
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-teal-900/20">
            🚀
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isSignUp ? 'Join the Growth OS ecosystem' : 'Enter your credentials to access your dashboard'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                required
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                placeholder="commander@growth-os.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                required
                minLength={6}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Error/Success Messages */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-linear-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                {isSignUp ? 'Sign Up' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
              className="ml-2 text-teal-400 hover:text-teal-300 font-medium hover:underline transition-all"
            >
              {isSignUp ? 'Sign In' : 'Create one'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}