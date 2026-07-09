'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ChevronDown, ChevronUp, Check, Plus, Flame, Dumbbell, Zap, Leaf,
  Sparkles, RefreshCw, X, Pencil, Trash2,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

// Local types (kept in sync with app/actions/fitness.ts)
export type Exercise = {
  name: string
  sets: number
  reps: string
  restSeconds: number
  muscleGroup: string
  equipment: string
  description: string
  phase: 'warmup' | 'strength' | 'cardio' | 'cooldown'
}

export type WorkoutDay = {
  dayName: string
  focus: string
  exercises: Exercise[]
  estimatedMinutes: number
}

type BuilderExercise = Exercise & { included: boolean }
type BuilderDay = { dayName: string; focus: string; exercises: BuilderExercise[] }

const PHASE_ORDER: Exercise['phase'][] = ['warmup', 'strength', 'cardio', 'cooldown']
const PHASE_META: Record<Exercise['phase'], { label: string; icon: typeof Flame; color: string }> = {
  warmup:   { label: 'Разминка',    icon: Flame,    color: 'text-orange-400' },
  strength: { label: 'Силовой блок', icon: Dumbbell, color: 'text-blue-400' },
  cardio:   { label: 'Кардио',       icon: Zap,      color: 'text-cyan-400' },
  cooldown: { label: 'Заминка',      icon: Leaf,     color: 'text-green-400' },
}

// ─── Add Exercise Panel ───────────────────────────────────────────────────────

type AddMode = 'day' | 'pick' | 'ai' | 'manual'

type ManualForm = {
  name: string
  sets: string
  reps: string
  restSeconds: string
  muscleGroup: string
  equipment: string
  description: string
  phase: Exercise['phase']
}

const EMPTY_MANUAL: ManualForm = {
  name: '', sets: '3', reps: '10-12', restSeconds: '60',
  muscleGroup: '', equipment: '', description: '', phase: 'strength',
}

function AddExercisePanel({
  dayFocus,
  existingExercises,
  onAdd,
  onClose,
  // Optional: when launched globally, show a day-picker step first
  allDays,
  initialDayIdx,
  onDaySelected,
}: {
  dayFocus: string
  existingExercises: Exercise[]
  onAdd: (ex: Exercise) => void
  onClose: () => void
  allDays?: BuilderDay[]
  initialDayIdx?: number
  onDaySelected?: (idx: number) => void
}) {
  const { lang } = useTranslation()
  // Start at 'day' step only when launched globally (allDays provided, no dayFocus yet)
  const [mode, setMode] = useState<AddMode>(allDays && initialDayIdx === undefined ? 'day' : 'pick')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiPhase, setAiPhase] = useState<Exercise['phase']>('strength')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState<Exercise | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [manual, setManual] = useState<ManualForm>(EMPTY_MANUAL)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (mode === 'ai') setTimeout(() => promptRef.current?.focus(), 50)
  }, [mode])

  const generateAI = async (prompt: string) => {
    if (!prompt.trim()) return
    setAiLoading(true)
    setAiError(null)
    setAiPreview(null)
    try {
      const res = await fetch('/api/generate-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, dayFocus, existingExercises, phase: aiPhase, lang }),
      })
      const data = await res.json()
      if (!res.ok || !data.exercise) throw new Error(data.error ?? (lang === 'ru' ? 'Ошибка генерации' : 'Generation error'))
      setAiPreview(data.exercise)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : (lang === 'ru' ? 'Ошибка' : 'Error'))
    } finally {
      setAiLoading(false)
    }
  }

  const manualValid =
    manual.name.trim().length > 0 &&
    Number(manual.sets) > 0 &&
    manual.reps.trim().length > 0

  const submitManual = () => {
    if (!manualValid) return
    onAdd({
      name: manual.name.trim(),
      sets: Number(manual.sets) || 3,
      reps: manual.reps.trim(),
      restSeconds: Number(manual.restSeconds) || 60,
      muscleGroup: manual.muscleGroup.trim() || 'Общее',
      equipment: manual.equipment.trim() || 'Без инвентаря',
      description: manual.description.trim(),
      phase: manual.phase,
    })
  }

  // ── Phase picker used in manual form ──
  const PhasePicker = () => (
    <div className="grid grid-cols-2 gap-1.5">
      {PHASE_ORDER.map(p => {
        const meta = PHASE_META[p]
        const Icon = meta.icon
        return (
          <button
            key={p}
            type="button"
            onClick={() => setManual(m => ({ ...m, phase: p }))}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              manual.phase === p
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${manual.phase === p ? 'text-primary' : meta.color}`} />
            {meta.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="border border-primary/30 rounded-2xl bg-card mt-2 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Добавить упражнение</p>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Day picker step (global launch only) */}
      {mode === 'day' && allDays && (
        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            В какую тренировку добавить?
          </p>
          <div className="flex flex-col gap-2">
            {allDays.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onDaySelected?.(i)
                  setMode('pick')
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">Тренировка {i + 1}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.focus}</p>
                </div>
                <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                  {d.exercises.filter(e => e.included).length} упр.
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode pick */}
      {mode === 'pick' && (
        <div className="p-4 flex flex-col gap-3">
          {allDays && (
            <p className="text-xs text-muted-foreground -mb-1">
              Тренировка: <span className="font-semibold text-foreground">{dayFocus}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => setMode('ai')}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Сгенерировать через AI</p>
              <p className="text-xs text-muted-foreground">Опишите что хотите — Groq подберет упражнение</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-secondary hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Добавить вручную</p>
              <p className="text-xs text-muted-foreground">Введите название, подходы и повторения самостоятельно</p>
            </div>
          </button>
          {allDays && (
            <button
              type="button"
              onClick={() => setMode('day')}
              className="text-xs text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
            >
              Изменить тренировку
            </button>
          )}
        </div>
      )}

      {/* AI mode */}
      {mode === 'ai' && (
        <div className="p-4 flex flex-col gap-3">
          {!aiPreview ? (
            <>
              {/* Phase selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Тип тренировки
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PHASE_ORDER.map(p => {
                    const meta = PHASE_META[p]
                    const Icon = meta.icon
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAiPhase(p)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                          aiPhase === p
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${aiPhase === p ? 'text-primary' : meta.color}`} />
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Опишите упражнение
              </label>
              <textarea
                ref={promptRef}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault()
                    generateAI(aiPrompt)
                  }
                }}
                placeholder="Например: упражнение на ягодицы без инвентаря, или: кардио на 30 секунд, или: разминка для плеч..."
                rows={3}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              {aiError && (
                <p className="text-xs text-destructive">{aiError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('pick')}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => generateAI(aiPrompt)}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
                >
                  {aiLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Генерирую...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Сгенерировать
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* AI preview card */
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{aiPreview.name}</p>
                    <p className="text-xs text-muted-foreground">{aiPreview.muscleGroup} · {aiPreview.equipment}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    aiPreview.phase === 'warmup' ? 'text-orange-400 border-orange-400/30 bg-orange-400/10' :
                    aiPreview.phase === 'cardio'  ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' :
                    aiPreview.phase === 'cooldown' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                    'text-blue-400 border-blue-400/30 bg-blue-400/10'
                  }`}>
                    {PHASE_META[aiPreview.phase].label}
                  </span>
                </div>
                <div className="flex gap-3 text-xs font-medium">
                  <span className="text-foreground">{aiPreview.sets} подх. × {aiPreview.reps}</span>
                  <span className="text-muted-foreground">Отдых {aiPreview.restSeconds}с</span>
                </div>
                {aiPreview.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiPreview.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAiPreview(null); generateAI(aiPrompt) }}
                  disabled={aiLoading}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Перегенерировать
                </button>
                <button
                  type="button"
                  onClick={() => onAdd(aiPreview)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 transition-opacity"
                >
                  <Check className="w-4 h-4" />
                  Добавить
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="p-4 flex flex-col gap-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Название упражнения <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={manual.name}
            onChange={e => setManual(m => ({ ...m, name: e.target.value }))}
            placeholder="Например: Приседания со штангой"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Подходы</label>
              <input
                type="number"
                min="1" max="10"
                value={manual.sets}
                onChange={e => setManual(m => ({ ...m, sets: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Повторения</label>
              <input
                type="text"
                value={manual.reps}
                onChange={e => setManual(m => ({ ...m, reps: e.target.value }))}
                placeholder="10-12"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Отдых (с)</label>
              <input
                type="number"
                min="0" max="300"
                value={manual.restSeconds}
                onChange={e => setManual(m => ({ ...m, restSeconds: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Группа мышц</label>
              <input
                type="text"
                value={manual.muscleGroup}
                onChange={e => setManual(m => ({ ...m, muscleGroup: e.target.value }))}
                placeholder="Ноги, Спина..."
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Инвентарь</label>
              <input
                type="text"
                value={manual.equipment}
                onChange={e => setManual(m => ({ ...m, equipment: e.target.value }))}
                placeholder="Гантели, Турник..."
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">Фаза тренировки</label>
            <PhasePicker />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Описание техники (необязательно)</label>
            <textarea
              value={manual.description}
              onChange={e => setManual(m => ({ ...m, description: e.target.value }))}
              placeholder="Краткое описание техники..."
              rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('pick')}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={submitManual}
              disabled={!manualValid}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 transition-opacity"
            >
              <Check className="w-4 h-4" />
              Добавить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main PlanConstructor ─────────────────────────────────────────────────────

export function PlanConstructor({
  days,
  onChange,
}: {
  days: WorkoutDay[]
  onChange: (days: WorkoutDay[]) => void
}) {
  const initial = useMemo<BuilderDay[]>(
    () =>
      days.map(d => {
        const included: BuilderExercise[] = d.exercises.map(e => ({ ...e, included: true }))
        return { dayName: d.dayName, focus: d.focus, exercises: included }
      }),
    [days],
  )

  const [builderDays, setBuilderDays] = useState<BuilderDay[]>(initial)
  const [openDay, setOpenDay] = useState(0)
  // Per-day add panel open state
  const [addOpenDay, setAddOpenDay] = useState<number | null>(null)
  // Global add panel (day picker first)
  const [globalAddOpen, setGlobalAddOpen] = useState(false)
  const [globalAddDayIdx, setGlobalAddDayIdx] = useState<number | undefined>(undefined)

  useEffect(() => setBuilderDays(initial), [initial])

  useEffect(() => {
    const result: WorkoutDay[] = builderDays.map(d => {
      const picked = d.exercises.filter(e => e.included).map(({ included, ...ex }) => ex)
      return { dayName: d.dayName, focus: d.focus, exercises: picked, estimatedMinutes: 0 }
    })
    onChange(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderDays])

  const toggle = (dayIdx: number, exName: string) => {
    setBuilderDays(prev =>
      prev.map((d, i) =>
        i !== dayIdx
          ? d
          : { ...d, exercises: d.exercises.map(e => e.name === exName ? { ...e, included: !e.included } : e) },
      ),
    )
  }

  const removeExercise = (dayIdx: number, exName: string) => {
    setBuilderDays(prev =>
      prev.map((d, i) =>
        i !== dayIdx ? d : { ...d, exercises: d.exercises.filter(e => e.name !== exName) },
      ),
    )
  }

  const addExercise = (dayIdx: number, ex: Exercise) => {
    setBuilderDays(prev =>
      prev.map((d, i) =>
        i !== dayIdx ? d : { ...d, exercises: [...d.exercises, { ...ex, included: true }] },
      ),
    )
    setAddOpenDay(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {builderDays.map((day, dayIdx) => {
        const open = openDay === dayIdx
        const includedCount = day.exercises.filter(e => e.included).length
        const byPhase = PHASE_ORDER.map(phase => ({
          phase,
          items: day.exercises.filter(e => e.phase === phase),
        })).filter(g => g.items.length > 0)
        const isAddOpen = addOpenDay === dayIdx

        return (
          <div key={dayIdx} className="border border-border rounded-2xl overflow-hidden">
            {/* Day header */}
            <button
              type="button"
              onClick={() => setOpenDay(open ? -1 : dayIdx)}
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  Тренировка {dayIdx + 1}
                </p>
                <p className="text-xs text-muted-foreground truncate">{day.focus}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {includedCount} упр.
                </span>
                {open ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {open && (
              <div className="px-3 pb-3 bg-card flex flex-col gap-3 pt-3">
                {/* Exercise list grouped by phase */}
                {byPhase.map(group => {
                  const meta = PHASE_META[group.phase]
                  const Icon = meta.icon
                  return (
                    <div key={group.phase} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 px-1">
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                      </div>
                      {group.items.map(ex => (
                        <div
                          key={ex.name}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                            ex.included
                              ? 'border-primary/40 bg-primary/10'
                              : 'border-border bg-secondary opacity-60'
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggle(dayIdx, ex.name)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all ${
                              ex.included
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border'
                            }`}
                            aria-label={ex.included ? 'Убрать' : 'Добавить'}
                          >
                            {ex.included && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${ex.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {ex.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {ex.sets}×{ex.reps} · {ex.equipment}
                            </p>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeExercise(dayIdx, ex.name)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                            aria-label="Удалить упражнение"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {/* Add exercise panel */}
                {isAddOpen ? (
                  <AddExercisePanel
                    dayFocus={day.focus}
                    existingExercises={day.exercises}
                    onAdd={ex => addExercise(dayIdx, ex)}
                    onClose={() => setAddOpenDay(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddOpenDay(dayIdx)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 hover:border-primary/60 transition-all mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить упражнение
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Global "add exercise" — shows day picker first */}
      {globalAddOpen ? (
        <AddExercisePanel
          dayFocus={globalAddDayIdx !== undefined ? builderDays[globalAddDayIdx].focus : ''}
          existingExercises={globalAddDayIdx !== undefined ? builderDays[globalAddDayIdx].exercises : []}
          allDays={builderDays}
          initialDayIdx={globalAddDayIdx}
          onDaySelected={idx => {
            setGlobalAddDayIdx(idx)
            // Auto-expand that day so the user sees the result
            setOpenDay(idx)
          }}
          onAdd={ex => {
            if (globalAddDayIdx !== undefined) addExercise(globalAddDayIdx, ex)
            setGlobalAddOpen(false)
            setGlobalAddDayIdx(undefined)
          }}
          onClose={() => {
            setGlobalAddOpen(false)
            setGlobalAddDayIdx(undefined)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setGlobalAddOpen(true); setGlobalAddDayIdx(undefined) }}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl border-2 border-dashed border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 hover:border-primary/70 transition-all"
        >
          <Plus className="w-4 h-4" />
          Добавить упражнение в тренировку
        </button>
      )}
    </div>
  )
}
