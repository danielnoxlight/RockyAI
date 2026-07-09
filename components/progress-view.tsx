'use client'

import { useState } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { useTranslation } from '@/lib/i18n'
import {
  BarChart3, CheckCircle2, Target, Zap, TrendingUp, CalendarCheck,
  ChevronDown, ChevronUp, Dumbbell,
} from 'lucide-react'

type Exercise = {
  name: string
  sets: number
  reps: string
  restSeconds: number
  muscleGroup: string
  equipment: string
  description: string
}

type WorkoutSession = {
  id: string
  scheduledDate: string
  completed: boolean
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

type ProgressLog = {
  id: string
  exerciseName: string
  sets: number | null
  reps: number | null
  weight: string | null
  loggedAt: Date | string
}



// ─── Expandable session card ──────────────────────────────────────────────────

function SessionHistoryCard({ session }: { session: WorkoutSession }) {
  const { t, lang } = useTranslation()
  const pr = t.progress
  const s2 = t.session
  const [open, setOpen] = useState(false)
  const exercises = (session.exercisesJson as Exercise[]) ?? []
  const totalSets = exercises.reduce((a, ex) => a + ex.sets, 0)
  const d = new Date(session.scheduledDate + 'T00:00:00')

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-colors ${session.completed ? 'border-green-500/20' : 'border-border'}`}>
      {/* Card header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${session.completed ? 'bg-green-400' : 'bg-border'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground capitalize">
            {d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercises.length} {s2.exercises} · {totalSets} {s2.sets}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mr-2 flex-shrink-0 ${
          session.completed ? 'text-green-400 bg-green-400/10' : 'text-muted-foreground bg-secondary'
        }`}>
          {session.completed ? pr.done : pr.missed}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expandable exercise list */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2 border-t border-border pt-3">
          {exercises.map((ex, ei) => (
            <div key={ei} className="bg-secondary rounded-xl px-3 py-2.5">
              {/* Exercise name */}
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <p className={`text-sm font-semibold ${session.completed ? 'text-foreground line-through decoration-muted-foreground/50' : 'text-foreground'}`}>
                  {ex.name}
                </p>
                <span className="ml-auto text-xs text-muted-foreground">{ex.equipment}</span>
              </div>
              {/* Set rows */}
              <div className="flex flex-col gap-1">
                {Array.from({ length: ex.sets }, (_, si) => (
                  <div
                    key={si}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                      session.completed ? 'bg-green-500/10' : 'bg-background'
                    }`}
                  >
                    {session.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />
                    )}
                    <span className={`text-xs transition-all ${
                      session.completed
                        ? 'text-green-400 line-through decoration-green-400/60'
                        : 'text-muted-foreground'
                    }`}>
                      {s2.setRow(si, ex.reps)}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {s2.restRow(ex.restSeconds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ProgressView ────────────────────────────────────────────────────────

export function ProgressView({
  plan,
  sessions,
  logs,
}: {
  plan: Plan | null
  sessions: WorkoutSession[]
  logs: ProgressLog[]
}) {
  const { t } = useTranslation()
  const pr = t.progress
  const s2 = t.session
  const totalSessions     = sessions.length
  const completedSessions = sessions.filter(s => s.completed).length
  const completionRate    = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

  // Weekly bar chart data
  const weeklyData = (() => {
    if (!plan) return []
    const start = new Date(plan.startDate)
    return Array.from({ length: Math.min(plan.durationWeeks, 12) }, (_, w) => {
      const ws = new Date(start)
      ws.setDate(start.getDate() + w * 7)
      const we = new Date(ws)
      we.setDate(ws.getDate() + 6)
      const wsStr = ws.toISOString().split('T')[0]
      const weStr = we.toISOString().split('T')[0]
      const week = sessions.filter(s => s.scheduledDate >= wsStr && s.scheduledDate <= weStr)
      return { week: w + 1, done: week.filter(s => s.completed).length, total: week.length }
    })
  })()

  const maxBar = Math.max(...weeklyData.map(w => w.total), plan?.sessionsPerWeek ?? 1)

  // Past sessions (completed or missed, sorted newest first)
  const pastSessions = [...sessions]
    .filter(s => s.scheduledDate <= new Date().toISOString().split('T')[0])
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))

  return (
    <main className="min-h-svh bg-background pb-safe-nav">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="pt-safe pb-5">
          <h1 className="text-2xl font-bold text-foreground">{pr.title}</h1>
          {plan && (
            <p className="text-sm text-muted-foreground mt-1">{pr.goals[plan.goal as keyof typeof pr.goals] ?? plan.goal}</p>
          )}
        </div>

        {!plan ? (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-3">
            <BarChart3 className="w-10 h-10 text-muted-foreground" />
            <p className="font-semibold text-foreground">{pr.noData}</p>
            <p className="text-sm text-muted-foreground">{pr.noDataSub}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-muted-foreground">{pr.statDone}</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{completedSessions}</span>
                <span className="text-xs text-muted-foreground">{pr.statOf(totalSessions)}</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{pr.statRate}</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
                <span className="text-xs text-muted-foreground">{pr.statOfPlan}</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-accent" />
                  <span className="text-xs text-muted-foreground">{pr.statDuration}</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{plan.durationWeeks}</span>
                <span className="text-xs text-muted-foreground">{pr.statWeeks}</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">{pr.statPerWeek}</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{plan.sessionsPerWeek}</span>
                <span className="text-xs text-muted-foreground">{pr.statSessions}</span>
              </div>
            </div>

            {/* Donut + overall progress */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{pr.overallProgress}</h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0">
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="36" fill="none" stroke="var(--color-secondary, #1c1c28)" strokeWidth="12" />
                    <circle
                      cx="48" cy="48" r="36" fill="none"
                      stroke="var(--color-primary, #6366f1)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - completionRate / 100)}`}
                      transform="rotate(-90 48 48)"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{completionRate}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{pr.doneDone}</p>
                    <p className="text-lg font-bold text-foreground">{completedSessions} / {totalSessions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{pr.remaining}</p>
                    <p className="text-lg font-bold text-foreground">{totalSessions - completedSessions}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly bar chart */}
            {weeklyData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-5">{pr.weeklyActivity}</h2>
                <div className="flex items-end gap-1.5 h-24">
                  {weeklyData.map(w => {
                    const heightDone  = maxBar > 0 ? (w.done  / maxBar) * 100 : 0
                    const heightTotal = maxBar > 0 ? (w.total / maxBar) * 100 : 0
                    return (
                      <div key={w.week} className="flex-1 h-full flex flex-col justify-end relative">
                        <div className="w-full bg-secondary rounded-t-sm absolute bottom-0" style={{ height: `${heightTotal}%` }} />
                        <div className="w-full bg-primary rounded-t-sm absolute bottom-0 transition-all duration-500" style={{ height: `${heightDone}%` }} />
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-1.5 mt-1">
                  {weeklyData.map(w => (
                    <div key={w.week} className="flex-1 text-center">
                      <span className="text-[9px] text-muted-foreground">{w.week}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-1">{pr.weekLabel}</p>
                <div className="flex items-center gap-4 justify-center mt-3 pt-3 border-t border-border">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> {pr.done}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-secondary border border-border" /> {pr.planned}
                  </span>
                </div>
              </div>
            )}

            {/* Past sessions with expandable sets */}
            {pastSessions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">{pr.historyTitle}</h2>
                <div className="flex flex-col gap-2">
                  {pastSessions.map(s => (
                    <SessionHistoryCard key={s.id} session={s} />
                  ))}
                </div>
              </div>
            )}

            {pastSessions.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-2">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">{pr.noHistory}</p>
                <p className="text-xs text-muted-foreground">{pr.noHistorySub}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
