import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  stepCountIs,
  tool,
  type UIMessage,
} from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { chatMessage as chatMessageTable, chatThread, profile as profileTable } from '@/lib/db/schema'
import { sql, eq, and, asc } from 'drizzle-orm'
import {
  getPlanDays,
  getPlanById,
  applyPlanDays,
  type Exercise,
  type WorkoutDay,
} from '@/app/actions/fitness'
import { saveThreadMessages } from '@/app/actions/chat'

export const maxDuration = 60

const PHASES = ['warmup', 'cardio', 'strength', 'cooldown'] as const

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
const GROQ_MODEL = groq('llama-3.3-70b-versatile')

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function ensureTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chat_thread (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Новый чат',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chat_message (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "threadId" TEXT NOT NULL DEFAULT 'default',
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    await db.execute(sql`
      ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS "threadId" TEXT NOT NULL DEFAULT 'default'
    `)
  } catch {
    // ignore
  }
}

function summarizeDays(days: WorkoutDay[], lang: string): string {
  if (days.length === 0) return lang === 'ru' ? 'В плане пока нет тренировочных дней.' : 'The plan has no training days yet.'
  return days
    .map((d, i) => {
      const lines = d.exercises
        .map(
          e =>
            `    • [${e.phase}] ${e.name} — ${e.sets}×${e.reps}, rest ${e.restSeconds}s`,
        )
        .join('\n')
      return lang === 'ru'
        ? `  День ${i} — "${d.dayName}" / фокус: "${d.focus}" (~${d.estimatedMinutes} мин):\n${lines}`
        : `  Day ${i} — "${d.dayName}" / focus: "${d.focus}" (~${d.estimatedMinutes} min):\n${lines}`
    })
    .join('\n\n')
}

function buildSystemPrompt(
  plan: { title: string; goal: string; planId: string } | null,
  workingDays: WorkoutDay[],
  userProfile: {
    weight?: string | null
    age?: number | null
    gender?: string | null
    height?: string | null
    fitnessLevel?: string | null
  } | null,
  lang: string,
): string {
  const isRu = lang === 'ru'
  const profileLines: string[] = []
  if (userProfile?.weight) profileLines.push(isRu ? `Вес: ${userProfile.weight} кг` : `Weight: ${userProfile.weight} kg`)
  if (userProfile?.age) profileLines.push(isRu ? `Возраст: ${userProfile.age} лет` : `Age: ${userProfile.age}`)
  if (userProfile?.gender) {
    if (isRu) {
      const g = userProfile.gender === 'male' ? 'Мужской' : userProfile.gender === 'female' ? 'Женский' : userProfile.gender
      profileLines.push(`Пол: ${g}`)
    } else {
      const g = userProfile.gender === 'male' ? 'Male' : userProfile.gender === 'female' ? 'Female' : userProfile.gender
      profileLines.push(`Gender: ${g}`)
    }
  }
  if (userProfile?.height) profileLines.push(isRu ? `Рост: ${userProfile.height} см` : `Height: ${userProfile.height} cm`)
  if (userProfile?.fitnessLevel) {
    if (isRu) {
      const f: Record<string, string> = { beginner: 'Начинающий', intermediate: 'Средний уровень', advanced: 'Продвинутый' }
      profileLines.push(`Уровень: ${f[userProfile.fitnessLevel] ?? userProfile.fitnessLevel}`)
    } else {
      const f: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
      profileLines.push(`Level: ${f[userProfile.fitnessLevel] ?? userProfile.fitnessLevel}`)
    }
  }
  const profileBlock = profileLines.length > 0
    ? isRu ? `\n═══ ПРОФИЛЬ ═══\n${profileLines.join(' | ')}\n` : `\n═══ PROFILE ═══\n${profileLines.join(' | ')}\n`
    : ''

  const weight = parseFloat(String(userProfile?.weight ?? '0')) || 0
  let weightNote = ''
  if (weight > 0 && weight < 60) weightNote = isRu ? 'Акцент на набор массы и силу.' : 'Focus on muscle gain and strength.'
  else if (weight > 100) weightNote = isRu ? 'Приоритет — функциональные упражнения и кардио с низкой ударной нагрузкой, беречь суставы.' : 'Priority — functional exercises and low-impact cardio, protect joints.'

  const base = isRu
    ? `Ты — персональный AI-фитнес-тренер уровня NSCA-CSCS. Общаешься на русском языке, дружелюбно и профессионально.${profileBlock}${weightNote ? `[Важно для этого пользователя]: ${weightNote}\n` : ''}
Принципы тренировки, которые ты соблюдаешь:
• Структура тренировки: Разминка → Кардио → Силовые (compound перед isolation) → Заминка
• Похудение: 3–4×15–20 повт., отдых 30–45 с
• Набор массы: 3–5×6–12 повт., отдых 60–90 с
• Сила: 4–5×3–6 повт., отдых 2–3 мин
• Выносливость: 3×15–25 повт., отдых 30–45 с

ГЛОБАЛЬНЫЕ ВОЗМОЖНОСТИ (используй инструменты, не текст):
• Полностью переделать план — replaceAllDays
• Поменять местами дни — swapDays
• Изменить название/фокус дня — setDayFocus
• Изменить цель плана — setPlanGoal
• Полностью перегенерировать план через AI — regeneratePlan
• Добавить / убрать / изменить конкретное упражнение — addExercise / removeExercise / updateExercise
• Посмотреть текущий план — listWorkouts

Правила:
- Всегда действуй через инструменты, когда пользователь просит изменить план.
- Не описывай изменения словами без их применения.
- Учитывай профиль пользователя и его пожелания.
- Помни всю историю переписки в этом чате.`
    : `You are a personal AI fitness coach at NSCA-CSCS level. Communicate in English, in a friendly and professional manner.${profileBlock}${weightNote ? `[Important for this user]: ${weightNote}\n` : ''}
Training principles you follow:
• Workout structure: Warm-up → Cardio → Strength (compound before isolation) → Cool-down
• Weight loss: 3–4×15–20 reps, rest 30–45 s
• Muscle gain: 3–5×6–12 reps, rest 60–90 s
• Strength: 4–5×3–6 reps, rest 2–3 min
• Endurance: 3×15–25 reps, rest 30–45 s

GLOBAL CAPABILITIES (use tools, not text descriptions):
• Completely redo the plan — replaceAllDays
• Swap days — swapDays
• Change day name/focus — setDayFocus
• Change plan goal — setPlanGoal
• Fully regenerate plan via AI — regeneratePlan
• Add / remove / modify a specific exercise — addExercise / removeExercise / updateExercise
• View the current plan — listWorkouts

Rules:
- Always act through tools when the user asks to change the plan.
- Do not describe changes in words without applying them.
- Consider the user profile and their wishes.
- Remember the entire chat history.`

  if (!plan) {
    return isRu
      ? `${base}\n\nУ пользователя НЕТ активного плана. Отвечай на вопросы о тренировках и питании. Предложи создать план через генератор на главном экране.`
      : `${base}\n\nThe user has NO active plan. Answer questions about training and nutrition. Suggest creating a plan through the generator on the home screen.`
  }

  return isRu
    ? `${base}\n\nАктивный план: "${plan.title}" (цель: ${plan.goal}).\nТекущие тренировочные дни:\n${summarizeDays(workingDays, lang)}`
    : `${base}\n\nActive plan: "${plan.title}" (goal: ${plan.goal}).\nCurrent training days:\n${summarizeDays(workingDays, lang)}`
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const userId = session.user.id

  const {
    messages,
    threadId = 'default',
    activePlanId,
    lang = 'en',
  }: { messages: UIMessage[]; threadId?: string; activePlanId?: string; lang?: string } = await req.json()

  const [plan, profileRows] = await Promise.all([
    activePlanId ? getPlanById(activePlanId) : getPlanDays(),
    db.select().from(profileTable).where(eq(profileTable.userId, userId)).limit(1).catch(() => []),
  ])
  const userProfile = profileRows[0] ?? null

  const workingDays: WorkoutDay[] = plan ? JSON.parse(JSON.stringify(plan.days)) : []
  let dirty = false

  const system = buildSystemPrompt(plan, workingDays, userProfile, lang)

  // ─── Extract last user message text for persistence ─────────────────────────
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const lastUserText = lastUserMsg?.parts
    ?.filter((p: { type: string }) => p.type === 'text')
    .map((p: { type: string; text?: string }) => p.text ?? '')
    .join('') ?? ''

  // ─── Tools ──────────────────────────────────────────────────────────────────

  const editingTools = plan ? {

    listWorkouts: tool({
      description: 'Показать текущие тренировочные дни и все упражнения.',
      inputSchema: z.object({}),
      execute: async () => ({ days: workingDays }),
    }),

    addExercise: tool({
      description: 'Добавить упражнение в тренировочный день.',
      inputSchema: z.object({
        dayIndex: z.number().int().describe('Индекс дня с 0'),
        name: z.string(),
        phase: z.enum(PHASES),
        muscleGroup: z.string(),
        equipment: z.string(),
        sets: z.number().int().min(1).max(10),
        reps: z.string(),
        restSeconds: z.number().int().min(0).max(300),
        description: z.string(),
      }),
      execute: async input => {
        const day = workingDays[input.dayIndex]
        if (!day) return { success: false, error: `День ${input.dayIndex} не найден` }
        day.exercises.push({
          name: input.name, sets: input.sets, reps: input.reps,
          restSeconds: input.restSeconds, muscleGroup: input.muscleGroup,
          equipment: input.equipment, description: input.description, phase: input.phase,
        } as Exercise)
        dirty = true
        return { success: true, added: input.name }
      },
    }),

    removeExercise: tool({
      description: 'Убрать упражнение из дня по названию.',
      inputSchema: z.object({
        dayIndex: z.number().int(),
        name: z.string(),
      }),
      execute: async input => {
        const day = workingDays[input.dayIndex]
        if (!day) return { success: false, error: `День ${input.dayIndex} не найден` }
        const before = day.exercises.length
        day.exercises = day.exercises.filter(e => e.name.toLowerCase() !== input.name.toLowerCase())
        if (day.exercises.length === before) return { success: false, error: `"${input.name}" не найдено` }
        dirty = true
        return { success: true, removed: input.name }
      },
    }),

    updateExercise: tool({
      description: 'Изменить параметры упражнения (подходы, повторения, отдых, название).',
      inputSchema: z.object({
        dayIndex: z.number().int(),
        name: z.string(),
        sets: z.number().int().min(1).max(10).optional(),
        reps: z.string().optional(),
        restSeconds: z.number().int().min(0).max(300).optional(),
        newName: z.string().optional(),
        description: z.string().optional(),
      }),
      execute: async input => {
        const day = workingDays[input.dayIndex]
        if (!day) return { success: false, error: `День ${input.dayIndex} не найден` }
        const ex = day.exercises.find(e => e.name.toLowerCase() === input.name.toLowerCase())
        if (!ex) return { success: false, error: `"${input.name}" не найдено` }
        if (input.sets !== undefined) ex.sets = input.sets
        if (input.reps !== undefined) ex.reps = input.reps
        if (input.restSeconds !== undefined) ex.restSeconds = input.restSeconds
        if (input.newName) ex.name = input.newName
        if (input.description) ex.description = input.description
        dirty = true
        return { success: true, updated: ex.name }
      },
    }),

    swapDays: tool({
      description: 'Поменять местами два тренировочных дня в плане (меняются полностью — упражнения, фокус, название).',
      inputSchema: z.object({
        dayIndexA: z.number().int().describe('Индекс первого дня (с 0)'),
        dayIndexB: z.number().int().describe('Индекс второго дня (с 0)'),
      }),
      execute: async ({ dayIndexA, dayIndexB }) => {
        if (!workingDays[dayIndexA] || !workingDays[dayIndexB]) {
          return { success: false, error: 'Один из дней не существует' }
        }
        const tmp = workingDays[dayIndexA]
        workingDays[dayIndexA] = workingDays[dayIndexB]
        workingDays[dayIndexB] = tmp
        dirty = true
        return { success: true, swapped: [dayIndexA, dayIndexB] }
      },
    }),

    setDayFocus: tool({
      description: 'Изменить название и фокус тренировочного дня (не трогает упражнения).',
      inputSchema: z.object({
        dayIndex: z.number().int(),
        dayName: z.string().describe('Новое название дня, напр. "Понедельник"'),
        focus: z.string().describe('Новый фокус, напр. "Грудь и трицепс"'),
      }),
      execute: async input => {
        const day = workingDays[input.dayIndex]
        if (!day) return { success: false, error: `День ${input.dayIndex} не найден` }
        day.dayName = input.dayName
        day.focus = input.focus
        dirty = true
        return { success: true, dayIndex: input.dayIndex, focus: input.focus }
      },
    }),

    setPlanGoal: tool({
      description: 'Изменить цель активного плана тренировок (например с "похудение" на "набор массы").',
      inputSchema: z.object({
        goal: z.string().describe('Новая цель: weight_loss | muscle_gain | strength | endurance | tone'),
      }),
      execute: async ({ goal }) => {
        if (!plan) return { success: false, error: 'Нет активного плана' }
        const { db: dbModule } = await import('@/lib/db')
        const { workoutPlan } = await import('@/lib/db/schema')
        const { eq: eqFn, and: andFn } = await import('drizzle-orm')
        await dbModule.update(workoutPlan)
          .set({ goal })
          .where(andFn(eqFn(workoutPlan.id, plan.planId), eqFn(workoutPlan.userId, userId)))
        dirty = true
        return { success: true, newGoal: goal }
      },
    }),

    replaceAllDays: tool({
      description: 'Полностью заменить ВСЕ тренировочные дни плана. Используй когда пользователь хочет кардинально переделать весь план.',
      inputSchema: z.object({
        days: z.array(z.object({
          dayName: z.string(),
          focus: z.string(),
          estimatedMinutes: z.number().int().optional(),
          exercises: z.array(z.object({
            name: z.string(),
            phase: z.enum(PHASES),
            muscleGroup: z.string(),
            equipment: z.string(),
            sets: z.number().int().min(1).max(10),
            reps: z.string(),
            restSeconds: z.number().int().min(0).max(300),
            description: z.string(),
          })),
        })).describe('Полный новый список тренировочных дней'),
      }),
      execute: async ({ days }) => {
        workingDays.length = 0
        for (const d of days) {
          workingDays.push({
            dayName: d.dayName,
            focus: d.focus,
            estimatedMinutes: d.estimatedMinutes ?? 45,
            exercises: d.exercises as Exercise[],
          })
        }
        dirty = true
        return { success: true, totalDays: workingDays.length }
      },
    }),

    regeneratePlan: tool({
      description: 'Полностью перегенерировать план через Groq AI с новыми параметрами. Используй когда пользователь хочет новый план на основе его описания.',
      inputSchema: z.object({
        goal: z.string().describe('Цель: weight_loss | muscle_gain | strength | endurance | tone'),
        targetMuscles: z.array(z.string()).describe('Целевые группы мышц'),
        sessionsPerWeek: z.number().int().min(2).max(7),
        availableEquipment: z.array(z.string()).describe('Доступное оборудование'),
        wishes: z.string().describe('Дополнительные пожелания пользователя'),
      }),
      execute: async (input) => {
        try {
          const res = await fetch(`${process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/optimize-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              days: workingDays,
              goal: input.goal,
              targetMuscles: input.targetMuscles,
              availableEquipment: input.availableEquipment,
              sessionsPerWeek: input.sessionsPerWeek,
              wishes: input.wishes,
              userProfile,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.optimized && data.days?.length > 0) {
              workingDays.length = 0
              for (const d of data.days) workingDays.push(d)
              dirty = true
              return { success: true, message: 'План перегенерирован AI', days: workingDays.length }
            }
          }
          return { success: false, error: 'AI оптимизатор недоступен' }
        } catch (e) {
          return { success: false, error: String(e) }
        }
      },
    }),

  } : undefined

  const result = streamText({
    model: GROQ_MODEL,
    system,
    messages: await convertToModelMessages(messages),
    tools: editingTools,
    stopWhen: stepCountIs(10),
    onFinish: async ({ text }) => {
      // Persist plan changes to DB
      if (dirty && plan) {
        await applyPlanDays(plan.planId, workingDays)
      }
      // Persist the message turn to the correct thread
      await ensureTables()
      const toSave: { role: 'user' | 'assistant'; content: string }[] = []
      if (lastUserText) toSave.push({ role: 'user', content: lastUserText })
      if (text) toSave.push({ role: 'assistant', content: text })
      if (toSave.length > 0) {
        // Ensure thread row exists
        const existing = await db.select().from(chatThread)
          .where(and(eq(chatThread.id, threadId), eq(chatThread.userId, userId)))
          .limit(1).catch(() => [])
        if (existing.length === 0) {
          await db.insert(chatThread).values({ id: threadId, userId, title: lang === 'ru' ? 'Новый чат' : 'New Chat' }).catch(() => {})
        }
        for (const m of toSave) {
          await db.insert(chatMessageTable).values({
            id: generateId(),
            userId,
            threadId,
            role: m.role,
            content: m.content,
          }).catch(() => {})
        }
        // Auto-title thread from first user message
        const defaultTitle = lang === 'ru' ? 'Новый чат' : 'New Chat'
        if (lastUserText && existing.length > 0 && (existing[0].title === 'Новый чат' || existing[0].title === 'New Chat')) {
          const autoTitle = lastUserText.slice(0, 50).trim()
          if (autoTitle) {
            await db.update(chatThread).set({ title: autoTitle })
              .where(and(eq(chatThread.id, threadId), eq(chatThread.userId, userId)))
              .catch(() => {})
          }
        }
      }
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
