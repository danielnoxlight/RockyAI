'use client'

import { useState } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { SessionDetail } from '@/components/session-detail'
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

type WorkoutSession = {
  id: string
  planId: string
  scheduledDate: string
  completed: boolean
  completedAt: string | null
  notes: string | null
  exercisesJson: unknown
}

type Plan = {
  id: string
  title: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  startDate: string
}



function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d
}

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []
  let start = getMondayOfWeek(firstDay)
  while (start <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(start))
    start = new Date(start)
    start.setDate(start.getDate() + 1)
  }
  return days
}

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function CalendarView({
  plans,
  sessions,
}: {
  plans: Plan[]
  sessions: WorkoutSession[]
}) {
  const { t, lang } = useTranslation()
  const cal = t.calendar
  const today = new Date()
  const [viewDate, setViewDate] = useState(today)
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null)
  // When a day has multiple sessions, show a picker list first
  const [pickerSessions, setPickerSessions] = useState<WorkoutSession[] | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days = getDaysInMonth(year, month)
  const todayStr = toDateStr(today)

  // Build a planId → title map for badges
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]))

  const sessionsByDate = sessions.reduce<Record<string, WorkoutSession[]>>((acc, s) => {
    acc[s.scheduledDate] = acc[s.scheduledDate] ? [...acc[s.scheduledDate], s] : [s]
    return acc
  }, {})

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthSessions = sessions
    .filter(s => s.scheduledDate.startsWith(monthStr))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  const handleDayClick = (daySessions: WorkoutSession[]) => {
    if (daySessions.length === 0) return
    if (daySessions.length === 1) {
      setSelectedSession(daySessions[0])
    } else {
      setPickerSessions(daySessions)
    }
  }

  const hasSessions = sessions.length > 0

  return (
    <main className="min-h-svh bg-background pb-safe-nav">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="pt-safe pb-4">
          <h1 className="text-2xl font-bold text-foreground">{cal.title}</h1>
          {plans.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {plans.length === 1 ? plans[0].title : `${plans.length} ${cal.plans}`}
            </p>
          )}
        </div>

        {!hasSessions ? (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-3">
            <CalendarDays className="w-10 h-10 text-muted-foreground" />
            <p className="font-semibold text-foreground">{cal.noActivePlan}</p>
            <p className="text-sm text-muted-foreground">{cal.noActivePlanSub}</p>
          </div>
        ) : (
          <>
            {/* Month navigator */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
                <span className="text-base font-semibold text-foreground">
                  {cal.months[month]} {year}
                </span>
                <button
                  onClick={nextMonth}
                  className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {cal.days.map((d: string) => (
                  <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-1">
                {days.map((day, i) => {
                  const ds = toDateStr(day)
                  const isCurrentMonth = day.getMonth() === month
                  const isToday = ds === todayStr
                  const daySessions = sessionsByDate[ds] ?? []
                  const hasSession = daySessions.length > 0
                  const allDone = hasSession && daySessions.every(s => s.completed)
                  const someDone = hasSession && daySessions.some(s => s.completed)
                  const multi = daySessions.length > 1

                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(daySessions)}
                      className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-all text-sm font-medium
                        ${!isCurrentMonth ? 'opacity-30' : ''}
                        ${isToday ? 'bg-primary text-primary-foreground' : ''}
                        ${hasSession && !isToday ? 'bg-secondary' : ''}
                        ${!hasSession && !isToday ? 'hover:bg-secondary/60' : ''}
                        ${hasSession && !isToday ? 'hover:bg-secondary/80' : ''}
                      `}
                    >
                      <span className={isToday ? 'text-primary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}>
                        {day.getDate()}
                      </span>
                      {/* Single dot or multi-dot indicators */}
                      {hasSession && !multi && (
                        <span
                          className={`absolute bottom-1 w-1.5 h-1.5 rounded-full
                            ${allDone ? 'bg-green-400' : someDone ? 'bg-yellow-400' : isToday ? 'bg-primary-foreground' : 'bg-primary'}`}
                        />
                      )}
                      {multi && (
                        <span className="absolute bottom-1 flex gap-0.5">
                          {daySessions.slice(0, 3).map((s, j) => (
                            <span
                              key={j}
                              className={`w-1 h-1 rounded-full ${s.completed ? 'bg-green-400' : isToday ? 'bg-primary-foreground' : 'bg-primary'}`}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border justify-center flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary" /> {cal.planned}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" /> {cal.partial}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-green-400" /> {cal.done}
                </span>
                {plans.length > 1 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      <span className="w-1 h-1 rounded-full bg-primary" />
                    </span>
                    {cal.multiple}
                  </span>
                )}
              </div>
            </div>

            {/* Sessions list for month */}
            <h2 className="text-sm font-semibold text-foreground mb-3">{cal.thisMonth}</h2>
            {monthSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{cal.noSessionsMonth}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {monthSessions.map(s => {
                  const exs = (s.exercisesJson as { name: string }[]) ?? []
                  const d = new Date(s.scheduledDate + 'T00:00:00')
                  const planTitle = planMap[s.planId]?.title
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-4 w-full text-left hover:border-primary/30 transition-colors"
                    >
                      <div className={`w-2 h-10 rounded-full flex-shrink-0 ${s.completed ? 'bg-green-400' : 'bg-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground capitalize">
                            {d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </p>
                          {plans.length > 1 && planTitle && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 leading-none">
                              {planTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {exs.slice(0, 3).map(e => e.name).join(', ')}
                          {exs.length > 3 && ` +${exs.length - 3}`}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        s.completed
                          ? 'text-green-400 bg-green-400/10'
                          : 'text-primary bg-primary/10'
                      }`}>
                        {s.completed ? cal.done : cal.planned}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Multi-session day picker */}
      {pickerSessions && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPickerSessions(null)}
          />
          <div className="relative z-10 w-full max-w-lg mx-auto bg-card border-t border-border rounded-t-3xl px-4 pt-5" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4">
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base">
                {cal.sessionsToday}
              </h3>
              <button
                onClick={() => setPickerSessions(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {pickerSessions.map(s => {
                const exs = (s.exercisesJson as { name: string }[]) ?? []
                const planTitle = planMap[s.planId]?.title
                return (
                  <button
                    key={s.id}
                    onClick={() => { setPickerSessions(null); setSelectedSession(s) }}
                    className="bg-secondary border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
                  >
                    <div className={`w-2 h-9 rounded-full flex-shrink-0 ${s.completed ? 'bg-green-400' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      {planTitle && (
                        <p className="text-[11px] font-semibold text-primary mb-0.5">{planTitle}</p>
                      )}
                      <p className="text-sm font-semibold text-foreground truncate">
                        {exs.slice(0, 2).map(e => e.name).join(', ')}
                        {exs.length > 2 && ` +${exs.length - 2}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{exs.length} {cal.exercises}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      s.completed ? 'text-green-400 bg-green-400/10' : 'text-primary bg-primary/10'
                    }`}>
                      {s.completed ? cal.done : cal.planned}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Session detail drawer */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSession(null)}
          />
          <div className="relative z-10 w-full max-w-lg mx-auto bg-card border-t border-border rounded-t-3xl px-4 pt-5 max-h-[90svh] overflow-y-auto" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <SessionDetail
              session={selectedSession}
              onClose={() => setSelectedSession(null)}
            />
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
