'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Bot, BarChart3, User } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const tabs = [
    { href: '/',         label: t.nav.home,     icon: Home },
    { href: '/calendar', label: t.nav.calendar, icon: CalendarDays },
    { href: '/coach',    label: t.nav.coach,    icon: Bot },
    { href: '/progress', label: t.nav.progress, icon: BarChart3 },
    { href: '/profile',  label: t.nav.profile,  icon: User },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors min-w-0 px-1 ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-6 rounded-xl transition-all ${
                active ? 'bg-primary/15' : ''
              }`}>
                <Icon className={`w-4.5 h-4.5 transition-transform ${active ? 'scale-110' : ''}`} style={{ width: '18px', height: '18px' }} />
              </div>
              <span className={`text-[9px] font-semibold leading-none tracking-wide truncate w-full text-center ${active ? 'text-primary' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
