import type { Metadata } from 'next'
import { Inter } from 'next/font/google' // Professional Font
import './globals.css'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Growth OS',
  description: 'Your personal operating system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.className} bg-slate-50 text-slate-900 flex`}>
        <Sidebar />
        <main className="flex-1 ml-72 p-8 h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  )
}