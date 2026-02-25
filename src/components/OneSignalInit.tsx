'use client'

import { useEffect } from 'react'
import OneSignal from 'react-onesignal'

export default function OneSignalInit() {
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const runOneSignal = async () => {
        try {
          await OneSignal.init({
            appId: "51ae6786-1e2c-4402-83b0-69b6be430706", // <--- PASTE YOUR ID HERE
            allowLocalhostAsSecureOrigin: true, // Allows testing on localhost
            notifyButton: {
              enable: true, // Shows a floating bell icon for subscribing
            } as any, // <--- THE FIX: This bypasses the strict check
            serviceWorker: {
              path: "/OneSignalSDKWorker.js", // Points to the file we made
            },
          })
          
          // Optional: Tag this user so you can target them specifically
          // OneSignal.User.addTag("rank", "commander");
        } catch (error) {
          console.error("OneSignal Init Error:", error)
        }
      }

      runOneSignal()
    }
  }, [])

  return null // This component is invisible
}