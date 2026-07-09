import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { exercises, effortData, planGoal, userProfile, lang = 'en' } = await req.json()

  const isRu = lang === 'ru'

  // Build a readable summary of effort
  const effortLines = exercises
    .filter((ex: { name: string }) => effortData?.[ex.name])
    .map((ex: { name: string; sets: number; reps: string; restSeconds: number }) => {
      const e = effortData[ex.name]
      const feeling = isRu
        ? (e.feeling === 'easy' ? 'легко' : e.feeling === 'hard' ? 'тяжело' : 'нормально')
        : (e.feeling === 'easy' ? 'easy' : e.feeling === 'hard' ? 'hard' : 'moderate')
      const incomplete = e.completedSets !== undefined && e.completedSets < ex.sets
        ? isRu ? ` (выполнил ${e.completedSets} из ${ex.sets} подходов)` : ` (completed ${e.completedSets} of ${ex.sets} sets)`
        : ''
      return `- ${ex.name}: ${feeling}, score ${e.score}/10${incomplete}. Current: ${ex.sets}×${ex.reps}, rest ${ex.restSeconds}s`
    })
    .join('\n')

  if (!effortLines) {
    return Response.json({ recommendations: [], adaptedExercises: [] })
  }

  const profileNote = userProfile
    ? isRu
      ? `Профиль: ${[
          userProfile.weight ? `вес ${userProfile.weight} кг` : '',
          userProfile.age ? `${userProfile.age} лет` : '',
          userProfile.fitnessLevel ?? '',
        ].filter(Boolean).join(', ')}.`
      : `Profile: ${[
          userProfile.weight ? `weight ${userProfile.weight} kg` : '',
          userProfile.age ? `${userProfile.age} years old` : '',
          userProfile.fitnessLevel ?? '',
        ].filter(Boolean).join(', ')}.`
    : ''

  const systemPrompt = isRu
    ? `Ты — персональный тренер с квалификацией NSCA-CSCS. Пользователь только что выполнил тренировку и оценил каждое упражнение по сложности.
${profileNote}
Цель плана: ${planGoal ?? 'общая физическая форма'}.

Данные по упражнениям (оценка 1=очень легко, 10=предельно тяжело):
${effortLines}

Правила адаптации:
- Оценка ≤3 (легко): увеличь нагрузку — добавь повторения (+2-4 повт) или подход
- Оценка 4-6 (норм): нагрузка оптимальна — сохрани или чуть прогрессируй
- Оценка ≥7 (тяжело): снизь нагрузку — убери подход или убавь повторения, увеличь отдых
- Неполное выполнение: снизь число подходов до выполненного, увеличь отдых

Ответь СТРОГО в JSON без лишнего текста:
{
  "summary": "2-3 предложения общего вывода о тренировке",
  "recommendations": [
    { "exerciseName": "...", "action": "increase|decrease|keep", "change": "конкретное изменение на русском", "newSets": 3, "newReps": "12-15", "newRestSeconds": 60 }
  ]
}`
    : `You are a personal trainer with NSCA-CSCS certification. The user just completed a workout and rated each exercise by difficulty.
${profileNote}
Plan goal: ${planGoal ?? 'general fitness'}.

Exercise data (score 1=very easy, 10=maximum effort):
${effortLines}

Adaptation rules:
- Score ≤3 (easy): increase load — add reps (+2-4) or a set
- Score 4-6 (moderate): load is optimal — keep or slightly progress
- Score ≥7 (hard): reduce load — remove a set or reduce reps, increase rest
- Incomplete (not all sets): reduce sets to completed count, increase rest

Respond STRICTLY in JSON without any extra text:
{
  "summary": "2-3 sentences of overall workout assessment",
  "recommendations": [
    { "exerciseName": "...", "action": "increase|decrease|keep", "change": "specific change in English", "newSets": 3, "newReps": "12-15", "newRestSeconds": 60 }
  ]
}`

  const result = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    messages: [{ role: 'user', content: isRu ? 'Проанализируй тренировку и дай рекомендации.' : 'Analyze the workout and provide recommendations.' }],
    system: systemPrompt,
    maxOutputTokens: 1024,
  })

  try {
    const text = result.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const parsed = JSON.parse(jsonMatch[0])
    return Response.json(parsed)
  } catch {
    return Response.json({ summary: result.text, recommendations: [] })
  }
}
