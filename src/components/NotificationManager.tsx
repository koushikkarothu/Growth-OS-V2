'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

export default function NotificationManager() {
  const [permission, setPermission] = useState('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if the browser supports notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  async function requestPermission() {
    if (!isSupported) {
      alert("Commander, your browser does not support secure comms.")
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted') {
      // Send a test ping immediately
      // We use 'as any' here to fix the TypeScript error about 'vibrate'
      new Notification("Growth OS Connected", {
        body: "Comms link established. Stand by for orders.",
        icon: "/icon-192x192.png",
        vibrate: [200, 100, 200]
      } as any) 
    }
  }

  // Hide the component if not supported OR if already granted
  if (!isSupported) return null
  if (permission === 'granted') return null 

  return (
    <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg text-white">
          <Bell size={20} />
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Enable Comms Link</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Authorize push notifications for mission updates.</p>
        </div>
      </div>
      <button 
        onClick={requestPermission}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
      >
        Activate
      </button>
    </div>
  )
}