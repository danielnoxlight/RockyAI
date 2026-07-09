'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateWorkoutPlan, previewWorkoutPlan } from '@/app/actions/fitness'
import { PlanConstructor, type WorkoutDay } from '@/components/plan-constructor'
import { Button } from '@/components/ui/button'
import {
  Sparkles, Target, Calendar, Dumbbell, Flame, Zap, Heart, Trophy,
  ChevronDown, ChevronUp, MessageSquare, SlidersHorizontal,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

// ---------- constants ----------

const GOAL_IDS = ['weight_loss', 'muscle_gain', 'endurance', 'strength', 'toning'] as const
const GOAL_ICONS = {
  weight_loss: Flame,
  muscle_gain: Dumbbell,
  endurance:   Heart,
  strength:    Trophy,
  toning:      Zap,
} as const
const GOAL_COLORS = {
  weight_loss: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  muscle_gain: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  endurance:   'text-red-400 border-red-400/30 bg-red-400/10',
  strength:    'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  toning:      'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
} as const

// English muscle display → internal English key used in actions
const MUSCLE_MAP_EN: Record<string, string> = {
  'Chest':     'Chest',
  'Back':      'Back',
  'Legs':      'Legs',
  'Shoulders': 'Shoulders',
  'Arms':      'Arms',
  'Core':      'Core',
  'Glutes':    'Glutes',
  'Full Body': 'Full Body',
}
// Russian display → internal English key
const MUSCLE_MAP_RU: Record<string, string> = {
  'Грудь':    'Chest',
  'Спина':    'Back',
  'Ноги':     'Legs',
  'Плечи':    'Shoulders',
  'Руки':     'Arms',
  'Пресс':    'Core',
  'Ягодицы':  'Glutes',
  'Всё тело': 'Full Body',
}

// Equipment item IDs and their labels by lang
const EQUIPMENT_ITEMS = {
  freeWeights: [
    { id: 'Barbell',    en: 'Barbell',       ru: 'Штанга' },
    { id: 'Dumbbells',  en: 'Dumbbells',     ru: 'Гантели' },
    { id: 'Kettlebell', en: 'Kettlebell',    ru: 'Гиря' },
  ],
  machines: [
    { id: 'Cable Machine',     en: 'Cable Machine',    ru: 'Блочный тренажер' },
    { id: 'Machine',           en: 'Weight Machines',  ru: 'Силовые тренажеры' },
    { id: 'Leg Press Machine', en: 'Leg Press',        ru: 'Жим ногами' },
    { id: 'Ab Wheel',          en: 'Ab Wheel',         ru: 'Ролик для пресса' },
  ],
  cardio: [
    { id: 'Treadmill',    en: 'Treadmill',     ru: 'Беговая дорожка' },
    { id: 'Rower',        en: 'Rowing Machine',ru: 'Гребной тренажер' },
    { id: 'Jump Rope',    en: 'Jump Rope',     ru: 'Скакалка' },
    { id: 'Battle Ropes', en: 'Battle Ropes',  ru: 'Боевые канаты' },
  ],
  other: [
    { id: 'Pull-up Bar', en: 'Pull-up Bar',   ru: 'Турник' },
    { id: 'Box',         en: 'Plyo Box',      ru: 'Тумба / плиобокс' },
    { id: 'Bodyweight',  en: 'No equipment',  ru: 'Без инвентаря' },
  ],
}

const WEEKS    = [4, 6, 8, 12]
const SESSIONS = [2, 3, 4, 5, 6]
const TOTAL_STEPS = 6

// ---------- EquipmentGroupBlock ----------

function EquipmentGroupBlock({
  groupLabel,
  items,
  selected,
  onToggle,
}: {
  groupLabel: string
  items: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const selectedCount = items.filter(i => selected.includes(i.id)).length

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary text-left"
      >
        <span className="text-sm font-semibold text-foreground">{groupLabel}</span>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <div className="p-3 grid grid-cols-2 gap-2 bg-card">
          {items.map(item => {
            const active = selected.includes(item.id)
            return (
              <button
                key={item.id}
                onClick={() => onToggle(item.id)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-border/80'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- component ----------

type UserProfile = {
  age?: number | null
  gender?: string | null
  height?: string | null
  weight?: string | null
  fitnessLevel?: string | null
}

export function GeneratePlanForm({ onClose, userProfile }: { onClose?: () => void; userProfile?: UserProfile | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { t, lang } = useTranslation()
  const g = t.generatePlan

  const [goal,      setGoal]      = useState('')
  const [muscles,   setMuscles]   = useState<string[]>([])   // always stored as English keys
  const [equipment, setEquipment] = useState<string[]>([])
  const [weeks,     setWeeks]     = useState(8)
  const [sessions,  setSessions]  = useState(3)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [weekdays,  setWeekdays]  = useState<number[]>([1, 3, 5])
  const [wishes,         setWishes]         = useState('')
  const [customEquipment, setCustomEquipment] = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [step,      setStep]      = useState(1)

  const [previewDays,      setPreviewDays]      = useState<WorkoutDay[]>([])
  const [customDays,       setCustomDays]       = useState<WorkoutDay[]>([])
  const [previewLoading,   setPreviewLoading]   = useState(false)
  const [optimizingWithAI, setOptimizingWithAI] = useState(false)
  const [aiOptimized,      setAiOptimized]      = useState(false)

  const muscleMap = lang === 'ru' ? MUSCLE_MAP_RU : MUSCLE_MAP_EN
  const displayMuscles = g.muscles

  const toggleMuscle = (display: string) => {
    const eng = muscleMap[display] ?? display
    if (eng === 'Full Body') { setMuscles(['Full Body']); return }
    setMuscles(prev => {
      const without = prev.filter(x => x !== 'Full Body')
      return without.includes(eng) ? without.filter(x => x !== eng) : [...without, eng]
    })
  }

  const isMuscleSelected = (display: string) => muscles.includes(muscleMap[display] ?? display)

  const toggleEquipment = (id: string) => {
    setEquipment(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleWeekday = (id: number) => {
    setWeekdays(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter(x => x !== id)
      }
      return [...prev, id].sort((a, b) => a - b)
    })
  }

  const handleSessionsChange = (s: number) => {
    setSessions(s)
    setWeekdays(prev => {
      let next = prev.slice(0, s)
      const defaults = [1, 3, 5, 2, 4, 6, 0]
      while (next.length < s) {
        const candidate = defaults.find(d => !next.includes(d))
        if (candidate === undefined) break
        next = [...next, candidate].sort((a, b) => a - b)
      }
      return next
    })
  }

  const canNext =
    step === 1 ? !!goal :
    step === 2 ? muscles.length > 0 :
    true

  // Get localised label for equipment id
  const allEquipmentItems = [
    ...EQUIPMENT_ITEMS.freeWeights,
    ...EQUIPMENT_ITEMS.machines,
    ...EQUIPMENT_ITEMS.cardio,
    ...EQUIPMENT_ITEMS.other,
  ]
  const equipLabel = (id: string) => {
    const item = allEquipmentItems.find(e => e.id === id)
    return item ? (lang === 'ru' ? item.ru : item.en) : id
  }

  // Reverse map: English muscle key → display label in current lang
  const muscleLabelFromEng = (eng: string): string => {
    const idx = Object.values(MUSCLE_MAP_EN).indexOf(eng)
    if (idx === -1) return eng
    return displayMuscles[idx] ?? eng
  }

  // Weekday helpers
  const WEEKDAYS_DATA = g.weekdaysShort.map((short, i) => ({
    id: [1, 2, 3, 4, 5, 6, 0][i],
    short,
    label: g.weekdaysFull[i],
  }))

  const buildInput = () => ({
    goal,
    targetMuscles: muscles,
    durationWeeks: weeks,
    sessionsPerWeek: sessions,
    startDate,
    availableEquipment: equipment,
    trainingDays: weekdays,
    wishes: [
      wishes.trim(),
      customEquipment.trim() ? `${g.extraEquipment} ${customEquipment.trim()}` : '',
    ].filter(Boolean).join('. '),
  })

  const loadPreview = () => {
    if (!goal || muscles.length === 0) return
    setError(null)
    setPreviewLoading(true)
    setAiOptimized(false)
    startTransition(async () => {
      try {
        const input = buildInput()
        const preview = await previewWorkoutPlan(input)
        setOptimizingWithAI(true)
        let finalDays = preview.days
        try {
          const res = await fetch('/api/optimize-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              days: preview.days,
              goal: input.goal,
              targetMuscles: input.targetMuscles,
              availableEquipment: input.availableEquipment,
              wishes: input.wishes,
              sessionsPerWeek: input.sessionsPerWeek,
              userProfile: userProfile ?? null,
              lang,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.optimized && data.days?.length > 0) {
              finalDays = data.days
              setAiOptimized(true)
            }
          }
        } catch {
          // Groq optimization failed — silently fall back to template days
        } finally {
          setOptimizingWithAI(false)
        }
        setPreviewDays(finalDays)
        setCustomDays(finalDays)
        setStep(6)
      } catch (e) {
        setError(e instanceof Error ? e.message : g.errorFallback)
      } finally {
        setPreviewLoading(false)
        setOptimizingWithAI(false)
      }
    })
  }

  const handleGenerate = () => {
    if (!goal || muscles.length === 0) return
    setError(null)
    startTransition(async () => {
      try {
        await generateWorkoutPlan({
          ...buildInput(),
          customDays: customDays.length > 0 ? customDays : undefined,
        })
        onClose?.()
        router.push('/calendar')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : g.errorFallback)
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{g.title}</h2>
          <p className="text-xs text-muted-foreground">{g.stepOf(step, TOTAL_STEPS)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i + 1 <= step ? 'bg-primary' : 'bg-secondary'}`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">{g.step1Title}</h3>
            </div>
            {GOAL_IDS.map(id => {
              const Icon = GOAL_ICONS[id]
              const label = g.goals[id]
              const color = GOAL_COLORS[id]
              return (
                <button
                  key={id}
                  onClick={() => setGoal(id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    goal === id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary hover:border-border/80'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`font-semibold ${goal === id ? 'text-primary' : 'text-foreground'}`}>
                    {label}
                  </span>
                  {goal === id && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Muscles */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">{g.step2Title}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {displayMuscles.map(m => (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    isMuscleSelected(m)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Equipment */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">{g.step3Title}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{g.equipmentHint}</p>

            <div className="flex flex-col gap-2">
              {(
                [
                  { key: 'freeWeights', items: EQUIPMENT_ITEMS.freeWeights },
                  { key: 'machines',    items: EQUIPMENT_ITEMS.machines },
                  { key: 'cardio',      items: EQUIPMENT_ITEMS.cardio },
                  { key: 'other',       items: EQUIPMENT_ITEMS.other },
                ] as const
              ).map(({ key, items }) => (
                <EquipmentGroupBlock
                  key={key}
                  groupLabel={g.equipGroups[key]}
                  items={items.map(i => ({ id: i.id, label: lang === 'ru' ? i.ru : i.en }))}
                  selected={equipment}
                  onToggle={toggleEquipment}
                />
              ))}
            </div>

            {equipment.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-secondary border border-border rounded-xl px-3 py-2.5 text-center mt-1">
                {g.noneSelected}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground bg-secondary border border-border rounded-xl px-3 py-2.5 mt-1">
                {g.selected}{' '}
                <span className="text-foreground font-medium">
                  {equipment.map(id => equipLabel(id)).join(', ')}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {g.customEquipment}
              </label>
              <input
                type="text"
                value={customEquipment}
                onChange={e => setCustomEquipment(e.target.value)}
                placeholder={g.customEquipmentPlaceholder}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[11px] text-muted-foreground">{g.customEquipmentHint}</p>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{g.step4ProgramDuration}</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {WEEKS.map(w => (
                  <button
                    key={w}
                    onClick={() => setWeeks(w)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      weeks === w
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    {g.weeks(w)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">{g.step4SessionsPerWeek}</h3>
              <div className="flex gap-2">
                {SESSIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSessionsChange(s)}
                    className={`flex-1 p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      sessions === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">{g.step4TrainingDays}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {g.selectedDays(weekdays.length, sessions)}
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS_DATA.map(d => {
                  const active = weekdays.includes(d.id)
                  const overLimit = !active && weekdays.length >= sessions
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleWeekday(d.id)}
                      disabled={overLimit}
                      title={d.label}
                      className={`aspect-square w-full flex items-center justify-center rounded-xl border-2 text-[11px] font-bold transition-all ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : overLimit
                            ? 'border-border bg-secondary text-muted-foreground/30 cursor-not-allowed'
                            : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d.short}
                    </button>
                  )
                })}
              </div>
              {weekdays.length !== sessions && (
                <p className="text-xs text-destructive mt-2">
                  {g.chooseDays(sessions)}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">{g.step4StartDate}</h3>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Step 5: Wishes + summary */}
        {step === 5 && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{g.step5Title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{g.step5Desc}</p>
              <textarea
                value={wishes}
                onChange={e => setWishes(e.target.value)}
                rows={5}
                placeholder={g.step5Placeholder}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Summary */}
            <div className="bg-secondary border border-border rounded-xl p-4 flex flex-col gap-2 text-sm">
              <p className="font-semibold text-foreground mb-1">{g.summaryTitle}</p>
              <Row label={g.rowGoal}    value={g.goals[goal as keyof typeof g.goals] ?? goal} />
              <Row
                label={g.rowMuscles}
                value={muscles.map(eng => muscleLabelFromEng(eng)).join(', ')}
              />
              <Row
                label={g.rowEquipment}
                value={[
                  equipment.length === 0 ? g.anyEquipment : equipment.map(id => equipLabel(id)).join(', '),
                  customEquipment.trim() || '',
                ].filter(Boolean).join(' + ') || g.anyEquipment}
              />
              <Row
                label={g.rowSchedule}
                value={g.scheduleValue(
                  weeks,
                  sessions,
                  weekdays.map(d => WEEKDAYS_DATA.find(w => w.id === d)?.short ?? '').join(', '),
                )}
              />
              {wishes.trim() && <Row label={g.rowWishes} value={wishes.trim()} />}
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Step 6: Constructor */}
        {step === 6 && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{g.step6Title}</h3>
                {aiOptimized && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    {g.aiImproved}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {aiOptimized ? g.step6DescAI : g.step6Desc}
              </p>
            </div>

            <PlanConstructor
              days={previewDays}
              onChange={setCustomDays}
            />

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 mt-6 pt-4 pb-2 border-t border-border">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={isPending}
            className="flex-1 border-border text-foreground"
          >
            {g.back}
          </Button>
        )}
        {step < TOTAL_STEPS ? (
          <Button
            onClick={() => (step === 5 ? loadPreview() : setStep(s => s + 1))}
            disabled={!canNext || (step === 4 && weekdays.length !== sessions) || previewLoading || optimizingWithAI}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {step === 5 && optimizingWithAI ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {g.aiImproving}
              </span>
            ) : step === 5 && previewLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {g.building}
              </span>
            ) : step === 5 ? (
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                {g.toConstructor}
              </span>
            ) : (
              g.next
            )}
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={isPending || weekdays.length !== sessions}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {g.creating}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {g.createPlan}
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-muted-foreground">
      {label}:{' '}
      <span className="text-foreground font-medium">{value}</span>
    </p>
  )
}
