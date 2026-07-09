import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export const maxDuration = 30

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, dayFocus, existingExercises, phase, lang = 'en' } = await req.json()

  const isRu = lang === 'ru'

  const phaseLabelsRu: Record<string, string> = {
    warmup: 'разминка', cardio: 'кардио', strength: 'силовое', cooldown: 'заминка',
  }
  const phaseLabelsEn: Record<string, string> = {
    warmup: 'warm-up', cardio: 'cardio', strength: 'strength', cooldown: 'cool-down',
  }
  const phaseLabel = isRu ? phaseLabelsRu[phase] : phaseLabelsEn[phase]
  const phaseHint = phase && phaseLabel
    ? isRu
      ? `Фаза упражнения: "${phaseLabel}" (phase должен быть строго "${phase}").`
      : `Exercise phase: "${phaseLabel}" (phase must be exactly "${phase}").`
    : ''

  const existingList = existingExercises?.length > 0
    ? isRu
      ? `Уже есть в тренировке: ${existingExercises.map((e: { name: string }) => e.name).join(', ')}.`
      : `Already in this workout: ${existingExercises.map((e: { name: string }) => e.name).join(', ')}.`
    : ''

  const systemPrompt = isRu
    ? `Ты — эксперт по фитнесу. Пользователь хочет добавить одно упражнение в тренировку.
Тренировка: "${dayFocus}".
${phaseHint}
${existingList}

Сгенерируй ОДНО упражнение строго в формате JSON. Никакого текста вокруг — только чистый JSON-объект.

Поля:
- name: string — название упражнения на русском
- sets: number — количество подходов (1–6)
- reps: string — повторения или время, например "12", "10-12", "30 сек", "1 мин"
- restSeconds: number — отдых между подходами в секундах (15–180)
- muscleGroup: string — основная мышечная группа на русском
- equipment: string — инвентарь на русском (если без — "Без инвентаря")
- description: string — 1-2 предложения техники выполнения на русском
- phase: "warmup" | "strength" | "cardio" | "cooldown" — ОБЯЗАТЕЛЬНО используй именно "${phase ?? 'strength'}"

Требования:
- НЕ менять phase — он задан пользователем и должен быть именно "${phase ?? 'strength'}"
- Не дублируй упражнения, которые уже есть
- Название конкретное (не просто "Приседания", а например "Приседания с кубком")
- Учитывай запрос пользователя максимально точно`
    : `You are a fitness expert. The user wants to add one exercise to their workout.
Workout: "${dayFocus}".
${phaseHint}
${existingList}

Generate ONE exercise strictly in JSON format. No surrounding text — only a clean JSON object.

Fields:
- name: string — exercise name in English
- sets: number — number of sets (1–6)
- reps: string — reps or time, e.g. "12", "10-12", "30 sec", "1 min"
- restSeconds: number — rest between sets in seconds (15–180)
- muscleGroup: string — primary muscle group in English
- equipment: string — equipment in English (if none — "No equipment")
- description: string — 1-2 sentences on execution technique in English
- phase: "warmup" | "strength" | "cardio" | "cooldown" — MUST use exactly "${phase ?? 'strength'}"

Requirements:
- Do NOT change phase — it is set by the user and must be exactly "${phase ?? 'strength'}"
- Do not duplicate exercises already in the workout
- Use a specific name (not just "Squats" but e.g. "Goblet Squats")
- Follow the user's request as closely as possible`

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      prompt: isRu ? `Запрос пользователя: "${prompt}"` : `User request: "${prompt}"`,
      maxOutputTokens: 400,
      temperature: 0.7,
    })

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const exercise = JSON.parse(jsonMatch[0])

    // Validate required fields
    const required = ['name', 'sets', 'reps', 'restSeconds', 'muscleGroup', 'equipment', 'description', 'phase']
    for (const field of required) {
      if (exercise[field] === undefined || exercise[field] === null) {
        throw new Error(`Missing field: ${field}`)
      }
    }

    // Coerce types
    exercise.sets = Number(exercise.sets) || 3
    exercise.restSeconds = Number(exercise.restSeconds) || 60
    const validPhases = ['warmup', 'strength', 'cardio', 'cooldown']
    // Always honour the phase the user picked; fall back to 'strength' only if nothing valid
    if (phase && validPhases.includes(phase)) {
      exercise.phase = phase
    } else if (!validPhases.includes(exercise.phase)) {
      exercise.phase = 'strength'
    }

    return NextResponse.json({ exercise })
  } catch (e) {
    console.error('[generate-exercise]', e)
    return NextResponse.json({ error: 'Failed to generate exercise' }, { status: 500 })
  }
}
