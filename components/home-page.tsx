'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { getActivePlan, getSessionsForPlan, getProfile } from '@/app/actions/fitness'
import { BottomNav } from '@/components/bottom-nav'
import { GeneratePlanForm } from '@/components/generate-plan-form'
import { ExerciseCard, Exercise } from '@/components/exercise-card'
import { Sparkles, Dumbbell, CalendarCheck, Flame, ChevronRight, Plus, Trophy, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

function BottomNavLink({ label }: { label: string }) {
  return (
    <Link
      href="/profile"
      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors"
    >
      {label}
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  )
}

type Plan = {
  id: string
  title: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  startDate: string
  planJson: unknown
}

type Session = {
  id: string
  scheduledDate: string
  completed: boolean
  exercisesJson: unknown
}

type UserProfile = {
  age?: number | null
  gender?: string | null
  height?: string | null
  weight?: string | null
  fitnessLevel?: string | null
}

function isProfileComplete(p: UserProfile | null): boolean {
  if (!p) return false
  return !!(
    p.weight && parseFloat(p.weight) > 0 &&
    p.height && parseFloat(p.height) > 0 &&
    p.gender &&
    p.fitnessLevel
  )
}

export function HomePage({ userName }: { userName: string }) {
  const { t, lang } = useTranslation()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showGenerator, setShowGenerator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showProfileAlert, setShowProfileAlert] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [, startTransition] = useTransition()

  const firstName = userName?.split(' ')[0] ?? 'Athlete'

  const getMissingProfileFields = (p: UserProfile | null): string[] => {
    const missing: string[] = []
    if (lang === 'ru') {
      if (!p || !p.weight || parseFloat(p.weight) <= 0) missing.push('вес')
      if (!p || !p.height || parseFloat(p.height) <= 0) missing.push('рост')
      if (!p || !p.gender) missing.push('пол')
      if (!p || !p.fitnessLevel) missing.push('уровень подготовки')
    } else {
      if (!p || !p.weight || parseFloat(p.weight) <= 0) missing.push('weight')
      if (!p || !p.height || parseFloat(p.height) <= 0) missing.push('height')
      if (!p || !p.gender) missing.push('gender')
      if (!p || !p.fitnessLevel) missing.push('fitness level')
    }
    return missing
  }

  useEffect(() => {
    startTransition(async () => {
      const [p, prof] = await Promise.all([getActivePlan(), getProfile()])
      setPlan(p)
      setUserProfile(prof)
      if (p) {
        const s = await getSessionsForPlan(p.id)
        setSessions(s as Session[])
      }
      setLoading(false)
    })
  }, [])

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const todaySessions = sessions.filter(s => s.scheduledDate === todayStr)
  const upcomingSessions = sessions
    .filter(s => s.scheduledDate > todayStr && !s.completed)
    .slice(0, 3)
  const completedCount = sessions.filter(s => s.completed).length
  const totalCount = sessions.length
  const streak = Math.floor(completedCount / Math.max(plan?.sessionsPerWeek ?? 3, 1))

  const tryOpenGenerator = () => {
    if (!isProfileComplete(userProfile)) {
      setMissingFields(getMissingProfileFields(userProfile))
      setShowProfileAlert(true)
      return
    }
    setShowProfileAlert(false)
    setShowGenerator(true)
  }

  const getGreeting = () => {
    const h = now.getHours()
    if (h < 12) return t.home.greetingMorning
    if (h < 18) return t.home.greetingAfternoon
    return t.home.greetingEvening
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short',
    })

  if (showGenerator) {
    return (
      <main className="min-h-svh bg-background pb-safe-nav">
        <div className="max-w-lg mx-auto px-4 pt-safe">
          <GeneratePlanForm onClose={() => setShowGenerator(false)} userProfile={userProfile} />
        </div>
        <BottomNav />
      </main>
    )
  }

  const ProfileAlert = () => (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t.home.fillProfile}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t.home.fillProfileDesc}
            <span className="text-amber-400 font-medium">{missingFields.join(', ')}</span>
          </p>
        </div>
      </div>
      <BottomNavLink label={t.home.goToProfile} />
    </div>
  )

  return (
    <main className="min-h-svh bg-background pb-safe-nav">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="pt-safe pb-5 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{getGreeting()},</p>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mt-0.5">{firstName} {'👋'}</h1>
          </div>
          <div className="w-11 h-11 rounded-2xl overflow-hidden border border-primary/30">
            <img src="/logo.png" alt="RockyAI" className="w-full h-full object-cover" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-secondary border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !plan ? (
          <div className="flex flex-col gap-4">
            {showProfileAlert && <ProfileAlert />}
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{t.home.createPlanTitle}</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {t.home.createPlanDesc}
                </p>
              </div>
              <Button
                onClick={tryOpenGenerator}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t.home.generateBtn}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {([
                { icon: Dumbbell,     label: t.home.featureExercises, sub: t.home.featureExercisesSub },
                { icon: CalendarCheck, label: t.home.featureSchedule,  sub: t.home.featureScheduleSub },
                { icon: Trophy,       label: t.home.featureProgress,  sub: t.home.featureProgressSub },
              ] as { icon: React.ElementType; label: string; sub: string }[]).map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-2 text-center">
                  <Icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {showProfileAlert && <ProfileAlert />}

            {/* Plan summary */}
            <div className="bg-card border border-primary/20 rounded-3xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t.home.activePlan}</span>
                  <h2 className="text-lg font-bold text-foreground mt-1 leading-tight">{plan.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.home.goals[plan.goal as keyof typeof t.home.goals] ?? plan.goal} · {t.home.planMeta(plan.durationWeeks, plan.sessionsPerWeek)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={tryOpenGenerator}
                  variant="outline"
                  className="border-border text-muted-foreground ml-3 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {totalCount > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{t.home.progressLabel}</span>
                    <span>{completedCount} / {totalCount}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-3 flex flex-col gap-1">
                <CalendarCheck className="w-4 h-4 text-green-400" />
                <span className="text-xl font-bold text-foreground">{completedCount}</span>
                <span className="text-[11px] text-muted-foreground">{t.home.statDone}</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3 flex flex-col gap-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xl font-bold text-foreground">{streak}</span>
                <span className="text-[11px] text-muted-foreground">{t.home.statStreak}</span>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3 flex flex-col gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-xl font-bold text-foreground">
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </span>
                <span className="text-[11px] text-muted-foreground">{t.home.statSuccess}</span>
              </div>
            </div>

            {/* Today */}
            {todaySessions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                  {t.home.today}
                </h3>
                <div className="flex flex-col gap-3">
                  {todaySessions.map(s => {
                    const exs = (s.exercisesJson as Exercise[]) ?? []
                    return (
                      <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className={`px-4 py-3 border-b border-border ${s.completed ? 'bg-green-500/5' : 'bg-primary/5'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${s.completed ? 'text-green-400' : 'text-primary'}`}>
                              {s.completed ? `✓ ${t.home.completed}` : t.home.scheduled}
                            </span>
                            <span className="text-xs text-muted-foreground">{t.home.exercises(exs.length)}</span>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                          {exs.slice(0, 3).map((ex, i) => (
                            <ExerciseCard key={i} exercise={ex} index={i} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {todaySessions.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                  <CalendarCheck className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.home.restDay}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.home.restDaySub}</p>
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcomingSessions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/60 inline-block" />
                  {t.home.upcoming}
                </h3>
                <div className="flex flex-col gap-2">
                  {upcomingSessions.map(s => {
                    const exs = (s.exercisesJson as Exercise[]) ?? []
                    return (
                      <div key={s.id} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground capitalize">{formatDate(s.scheduledDate)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.home.exercises(exs.length)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
