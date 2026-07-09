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
  title: 'FitAI — Тренировки с AI',
  description: 'Персональные планы тренировок на основе AI с календарём, прогрессом и визуализацией упражнений.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#6366f1',
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
