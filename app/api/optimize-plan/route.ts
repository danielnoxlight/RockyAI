import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import type { WorkoutDay } from '@/app/actions/fitness'

export const maxDuration = 60

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

type UserProfile = {
  age?: number | null
  gender?: string | null
  height?: string | null
  weight?: string | null
  fitnessLevel?: string | null
}

function buildSystemPrompt(profile: UserProfile | null, lang = 'en'): string {
  const isRu = lang === 'ru'
  // Build biometric context block
  const profileLines: string[] = []
  if (profile?.weight) profileLines.push(isRu ? `- Вес: ${profile.weight} кг` : `- Weight: ${profile.weight} kg`)
  if (profile?.age) profileLines.push(isRu ? `- Возраст: ${profile.age} лет` : `- Age: ${profile.age}`)
  if (profile?.gender) {
    if (isRu) {
      const gLabel = profile.gender === 'male' ? 'Мужской' : profile.gender === 'female' ? 'Женский' : profile.gender
      profileLines.push(`- Пол: ${gLabel}`)
    } else {
      const gLabel = profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : profile.gender
      profileLines.push(`- Gender: ${gLabel}`)
    }
  }
  if (profile?.height) profileLines.push(isRu ? `- Рост: ${profile.height} см` : `- Height: ${profile.height} cm`)
  if (profile?.fitnessLevel) {
    if (isRu) {
      const fLabel: Record<string, string> = { beginner: 'Начинающий', intermediate: 'Средний уровень', advanced: 'Продвинутый' }
      profileLines.push(`- Уровень подготовки: ${fLabel[profile.fitnessLevel] ?? profile.fitnessLevel}`)
    } else {
      const fLabel: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
      profileLines.push(`- Fitness level: ${fLabel[profile.fitnessLevel] ?? profile.fitnessLevel}`)
    }
  }

  const profileBlock = profileLines.length > 0
    ? isRu ? `\nПрофиль пользователя:\n${profileLines.join('\n')}\n` : `\nUser profile:\n${profileLines.join('\n')}\n`
    : ''

  // Weight class guidance
  const weight = parseFloat(String(profile?.weight ?? '0')) || 0
  let weightGuidance = ''
  if (weight > 0) {
    if (weight < 60) {
      weightGuidance = isRu
        ? `Пользователь имеет низкий вес (${weight} кг). Делай акцент на силовых упражнениях с прогрессией нагрузки. Избегай избыточного кардио. Приоритет — набор мышечной массы и силы.`
        : `User has low body weight (${weight} kg). Focus on strength exercises with progressive overload. Avoid excessive cardio. Priority — muscle mass and strength gain.`
    } else if (weight <= 80) {
      weightGuidance = isRu
        ? `Пользователь имеет нормальный вес (${weight} кг). Применяй сбалансированный подход: умеренное кардио, полноценные силовые блоки.`
        : `User has a normal weight (${weight} kg). Apply a balanced approach: moderate cardio, full strength blocks.`
    } else if (weight <= 100) {
      weightGuidance = isRu
        ? `Пользователь имеет повышенный вес (${weight} кг). Увеличь долю кардио (LISS и HIIT). Избегай упражнений с высокой ударной нагрузкой на суставы. Отдавай предпочтение многосуставным упражнениям с умеренным весом и большим количеством повторений.`
        : `User has elevated weight (${weight} kg). Increase cardio (LISS and HIIT). Avoid high-impact joint exercises. Prefer compound movements with moderate weight and higher reps.`
    } else {
      weightGuidance = isRu
        ? `Пользователь имеет высокий вес (${weight} кг). Приоритет — функциональные упражнения с поддержкой тела. Минимизируй нагрузку на колени и голеностоп. Используй упражнения с собственным весом тела и лёгкими отягощениями.`
        : `User has high body weight (${weight} kg). Priority — supported functional exercises. Minimize stress on knees and ankles. Use bodyweight and light resistance exercises.`
    }
  }

  if (isRu) {
    return `Ты — сертифицированный персональный тренер уровня NSCA-CSCS и эксперт по спортивной науке. Ты оптимизируешь тренировочный план, строго следуя доказательным принципам спортивной физиологии.
${profileBlock}
${weightGuidance ? `Важно о весе пользователя:\n${weightGuidance}\n` : ''}
═══════════════════════════════════════
ОБЯЗАТЕЛЬНАЯ СТРУКТУРА КАЖДОЙ ТРЕНИРОВКИ (порядок НАРУШАТЬ НЕЛЬЗЯ):

1. РАЗМИНКА (phase: "warmup") — ВСЕГДА первая
   • 2–4 упражнения, 5–10 минут
   • Sets: 1–2, Reps: "30 sec" / "10-12", Rest: 10–20 сек

2. КАРДИО (phase: "cardio") — ВСЕГДА после разминки и ПЕРЕД силовыми
   • 1–3 упражнения, 10–20 минут

3. СИЛОВЫЕ (phase: "strength") — ВСЕГДА после кардио
   • 3–6 упражнений, compound первыми, isolation последними

4. ЗАМИНКА (phase: "cooldown") — ВСЕГДА последней
   • 2–4 упражнения, 5–10 минут, статические растяжки

ДОПОЛНИТЕЛЬНЫЕ ПРАВИЛА:
• Все описания упражнений (поле description) — на РУССКОМ языке
• Поле dayName — день недели на русском (Понедельник, Среда и т.д.) или порядковый (День 1, День 2)
• Поле focus — краткое описание акцента тренировки на русском

ФОРМАТ ОТВЕТА:
Верни ТОЛЬКО валидный JSON массив WorkoutDay объектов. Никаких пояснений, никакого текста вокруг, только JSON.`
  }

  return `You are a certified NSCA-CSCS personal trainer and sports science expert. You optimize workout plans strictly following evidence-based sports physiology principles.
${profileBlock}
${weightGuidance ? `Important about user weight:\n${weightGuidance}\n` : ''}
═══════════════════════════════════════
MANDATORY STRUCTURE FOR EACH WORKOUT (order MUST NOT be changed):

1. WARM-UP (phase: "warmup") — ALWAYS first
   • 2–4 exercises, 5–10 minutes
   • Sets: 1–2, Reps: "30 sec" / "10-12", Rest: 10–20 s

2. CARDIO (phase: "cardio") — ALWAYS after warm-up and BEFORE strength
   • 1–3 exercises, 10–20 minutes

3. STRENGTH (phase: "strength") — ALWAYS after cardio
   • 3–6 exercises, compound first, isolation last

4. COOL-DOWN (phase: "cooldown") — ALWAYS last
   • 2–4 exercises, 5–10 minutes, static stretches

ADDITIONAL RULES:
• All exercise descriptions (field description) — in ENGLISH
• dayName field — day of the week in English (Monday, Wednesday, etc.) or ordinal (Day 1, Day 2)
• focus field — short description of the workout focus in English

RESPONSE FORMAT:
Return ONLY a valid JSON array of WorkoutDay objects. No explanations, no surrounding text, only JSON.`
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    days,
    goal,
    targetMuscles,
    availableEquipment,
    wishes,
    sessionsPerWeek,
    userProfile,
    lang = 'en',
  }: {
    days: WorkoutDay[]
    goal: string
    targetMuscles: string[]
    availableEquipment: string[]
    wishes: string
    sessionsPerWeek: number
    userProfile?: UserProfile | null
    lang?: string
  } = await req.json()

  const isRu = lang === 'ru'

  const goalLabelsRu: Record<string, string> = {
    weight_loss: 'Похудение', muscle_gain: 'Набор мышечной массы', endurance: 'Выносливость',
    strength: 'Максимальная сила', toning: 'Рельеф и тонус',
  }
  const goalLabelsEn: Record<string, string> = {
    weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', endurance: 'Endurance',
    strength: 'Strength', toning: 'Toning',
  }
  const goalLabels = isRu ? goalLabelsRu : goalLabelsEn

  const userMessage = isRu
    ? `Оптимизируй и улучши этот тренировочный план, строго соблюдая все правила из системного промпта.

ПАРАМЕТРЫ ТРЕНИРОВОК:
- Цель: ${goalLabels[goal] ?? goal}
- Целевые группы мышц: ${targetMuscles.join(', ')}
- Доступное оборудование: ${availableEquipment.length > 0 ? availableEquipment.join(', ') : 'только собственный вес тела (Bodyweight)'}
- Тренировок в неделю: ${sessionsPerWeek}
- Пожелания пользователя: ${wishes || 'нет особых пожеланий'}

ТЕКУЩИЙ ПЛАН ДЛЯ ОПТИМИЗАЦИИ:
${JSON.stringify(days, null, 2)}

ТВОЯ ЗАДАЧА:
1. Проверь структуру каждой тренировки: warmup → cardio → strength → cooldown. Переставь упражнения если нужно.
2. Проверь порядок в силовом блоке: compound первыми, isolation последними.
3. Скорректируй sets/reps/restSeconds под цель "${goalLabels[goal] ?? goal}" и профиль пользователя.
4. При необходимости замени неподходящие упражнения на более подходящие.
5. Переведи все описания (description) на русский язык если они на английском.
6. Убедись, что разные дни тренируют разные мышечные группы (принцип суперкомпенсации).

Верни оптимизированный план как JSON массив WorkoutDay.`
    : `Optimize and improve this workout plan, strictly following all rules from the system prompt.

WORKOUT PARAMETERS:
- Goal: ${goalLabels[goal] ?? goal}
- Target muscle groups: ${targetMuscles.join(', ')}
- Available equipment: ${availableEquipment.length > 0 ? availableEquipment.join(', ') : 'bodyweight only'}
- Sessions per week: ${sessionsPerWeek}
- User wishes: ${wishes || 'no special requests'}

CURRENT PLAN TO OPTIMIZE:
${JSON.stringify(days, null, 2)}

YOUR TASK:
1. Check each workout structure: warmup → cardio → strength → cooldown. Reorder exercises if needed.
2. Check strength block order: compound first, isolation last.
3. Adjust sets/reps/restSeconds for the goal "${goalLabels[goal] ?? goal}" and user profile.
4. If needed, replace unsuitable exercises with better alternatives.
5. Translate all descriptions (description field) to English if they are in another language.
6. Ensure different days target different muscle groups (supercompensation principle).

Return the optimized plan as a JSON array of WorkoutDay.`

  try {
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: buildSystemPrompt(userProfile ?? null, lang),
      prompt: userMessage,
      maxOutputTokens: 4096,
    })

    const text = result.text.trim()

    // Extract JSON array from response — handle markdown code blocks too
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/)
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text

    const optimizedDays: WorkoutDay[] = JSON.parse(jsonStr)

    if (!Array.isArray(optimizedDays) || optimizedDays.length === 0) {
      return NextResponse.json({ days, optimized: false })
    }

    // Final safety pass: ensure phase order is correct (warmup first, cooldown last)
    const phaseOrder = { warmup: 0, cardio: 1, strength: 2, cooldown: 3 }
    const sortedDays = optimizedDays.map(day => ({
      ...day,
      exercises: [...day.exercises].sort(
        (a, b) =>
          (phaseOrder[a.phase as keyof typeof phaseOrder] ?? 2) -
          (phaseOrder[b.phase as keyof typeof phaseOrder] ?? 2),
      ),
    }))

    return NextResponse.json({ days: sortedDays, optimized: true })
  } catch (error) {
    console.error('[optimize-plan] Error:', error)
    return NextResponse.json({ days, optimized: false })
  }
}
