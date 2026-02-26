import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import MainLayout from '@/components/MainLayout' // We import the client component here
import OneSignalInit from '@/components/OneSignalInit' // <--- IMPORT THIS
import { ThemeProvider } from "@/components/ThemeProvider" // <--- Import this

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Growth OS | Elite Tracker',
  description: 'Cybernetic Personal Operating System',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#020617',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <OneSignalInit />
            <MainLayout>
              {children}
            </MainLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}