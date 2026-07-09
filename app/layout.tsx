import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { LangProvider } from '@/lib/i18n'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RockyAI — AI-Powered Fitness',
  description: 'Personalized AI workout plans with calendar, progress tracking, exercise visualization, and Rocky — your personal AI coach.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'RockyAI — AI-Powered Fitness',
    description: 'Personalized AI workout plans with calendar, progress tracking, exercise visualization, and Rocky — your personal AI coach.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RockyAI — AI-Powered Fitness',
    description: 'Personalized AI workout plans with calendar, progress tracking, exercise visualization, and Rocky — your personal AI coach.',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0d1b2a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${inter.variable}`}>
      <body className="antialiased font-sans bg-background text-foreground min-h-svh">
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
