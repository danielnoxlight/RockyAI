'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profile, workoutPlan, workoutSession, progressLog } from '@/lib/db/schema'
import { eq, and, desc, gte, lt, gt } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile() {
  const userId = await getUserId()
  const rows = await db.select().from(profile).where(eq(profile.userId, userId))
  return rows[0] ?? null
}

export async function upsertProfile(data: {
  age: number
  gender: string
  height: number
  weight: number
  fitnessLevel: string
}) {
  const userId = await getUserId()
  const existing = await db.select().from(profile).where(eq(profile.userId, userId))

  const values = {
    age: data.age,
    gender: data.gender,
    height: data.height.toString(),
    weight: data.weight.toString(),
    fitnessLevel: data.fitnessLevel,
  }

  if (existing.length > 0) {
    await db
      .update(profile)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(profile.userId, userId))
  } else {
    await db.insert(profile).values({
      id: generateId(),
      userId,
      ...values,
    })
  }
  revalidatePath('/')
}

// ─── Workout Plan Generation ───────────────────────────────────────────────────

export type GeneratePlanInput = {
  goal: string
  targetMuscles: string[]
  durationWeeks: number
  sessionsPerWeek: number
  startDate: string
  availableEquipment: string[]
  /** 0=Sun, 1=Mon … 6=Sat — the exact weekdays to schedule sessions */
  trainingDays: number[]
  /** Free-text user wishes that adjust the generated plan */
  wishes: string
  /** Optional user-customized days from the constructor — used instead of auto-generation */
  customDays?: WorkoutDay[]
  /** UI language — used to localise the plan title */
  lang?: 'en' | 'ru'
}

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

export type WeekPlan = {
  week: number
  days: WorkoutDay[]
}

// ─── Exercise library ─────────────────────────────────────────────────────────

type ExerciseTemplate = {
  name: string
  sets: number
  reps: string
  restSeconds: number
  muscleGroup: string
  equipment: string
  description: string
  phase: 'warmup' | 'strength' | 'cardio' | 'cooldown'
}

// ─── Warmup library ───────────────────────────────────────────────────────────

const WARMUP_EXERCISES: ExerciseTemplate[] = [
  { name: 'Jumping Jacks', sets: 2, reps: '30 sec', restSeconds: 15, muscleGroup: 'Full Body', equipment: 'Bodyweight', description: 'Jump feet wide while raising arms overhead, return to start. Elevates heart rate gently.', phase: 'warmup' },
  { name: 'Arm Circles', sets: 2, reps: '15 per dir', restSeconds: 10, muscleGroup: 'Shoulders', equipment: 'Bodyweight', description: 'Extend arms and rotate forward then backward in large circles to mobilise shoulder joint.', phase: 'warmup' },
  { name: 'Hip Circle', sets: 2, reps: '10 per dir', restSeconds: 10, muscleGroup: 'Glutes', equipment: 'Bodyweight', description: 'Hands on hips, draw large circles with your hips to mobilise the hip flexors.', phase: 'warmup' },
  { name: 'Bodyweight Squat', sets: 2, reps: '15', restSeconds: 20, muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Feet shoulder-width, squat to parallel, focus on depth and upright torso. Primes quads and glutes.', phase: 'warmup' },
  { name: 'Cat-Cow Stretch', sets: 2, reps: '10', restSeconds: 10, muscleGroup: 'Back', equipment: 'Bodyweight', description: 'On all fours, alternate arching the spine (cow) and rounding it (cat). Mobilises the entire spine.', phase: 'warmup' },
  { name: 'Leg Swing', sets: 2, reps: '12 per leg', restSeconds: 10, muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Hold a support, swing each leg forward and back to open hip flexors and hamstrings.', phase: 'warmup' },
  { name: 'Inchworm', sets: 2, reps: '8', restSeconds: 15, muscleGroup: 'Full Body', equipment: 'Bodyweight', description: 'Hinge forward, walk hands to plank, do a push-up, walk feet in. Full-body activation.', phase: 'warmup' },
]

// ─── Cooldown library ─────────────────────────────────────────────────────────

const COOLDOWN_EXERCISES: ExerciseTemplate[] = [
  { name: 'Standing Quad Stretch', sets: 1, reps: '30 sec each', restSeconds: 0, muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Stand on one leg, pull ankle to glute. Hold and feel the quad lengthen. Switch sides.', phase: 'cooldown' },
  { name: 'Seated Hamstring Stretch', sets: 1, reps: '30 sec each', restSeconds: 0, muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Sit with one leg extended, reach toward foot. Keep back straight and breathe deeply.', phase: 'cooldown' },
  { name: 'Chest Opener Stretch', sets: 1, reps: '30 sec', restSeconds: 0, muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Interlace fingers behind your back, lift arms and open chest. Breathe and hold.', phase: 'cooldown' },
  { name: 'Child\'s Pose', sets: 1, reps: '45 sec', restSeconds: 0, muscleGroup: 'Back', equipment: 'Bodyweight', description: 'Kneel, sit back on heels and reach arms forward. Lets the spine decompress fully.', phase: 'cooldown' },
  { name: 'Pigeon Pose', sets: 1, reps: '30 sec each', restSeconds: 0, muscleGroup: 'Glutes', equipment: 'Bodyweight', description: 'From plank, bring one knee forward behind the wrist. Lower hips and breathe into the stretch.', phase: 'cooldown' },
  { name: 'Shoulder Cross Stretch', sets: 1, reps: '20 sec each', restSeconds: 0, muscleGroup: 'Shoulders', equipment: 'Bodyweight', description: 'Pull one arm across chest with opposite hand. Feel the rear deltoid and upper back lengthen.', phase: 'cooldown' },
  { name: 'Supine Twist', sets: 1, reps: '30 sec each', restSeconds: 0, muscleGroup: 'Back', equipment: 'Bodyweight', description: 'Lie on back, draw one knee across the body. Keep shoulders flat on the floor.', phase: 'cooldown' },
]

const EXERCISE_LIBRARY: Record<string, ExerciseTemplate[]> = {
  Chest: [
    { name: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90, muscleGroup: 'Chest', equipment: 'Barbell', description: 'Lie on bench, lower bar to chest, press up explosively', phase: 'strength' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 75, muscleGroup: 'Chest', equipment: 'Dumbbells', description: 'Set bench to 30-45°, press dumbbells up and slightly together', phase: 'strength' },
    { name: 'Cable Flye', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Chest', equipment: 'Cable Machine', description: 'Stand between cables, sweep arms together in wide arc', phase: 'strength' },
    { name: 'Push-Up', sets: 3, reps: '15-20', restSeconds: 60, muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Keep body straight, lower chest to floor, push back up', phase: 'strength' },
    { name: 'Dumbbell Pullover', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Chest', equipment: 'Dumbbells', description: 'Lie on bench, arc dumbbell from chest over head and back', phase: 'strength' },
  ],
  Back: [
    { name: 'Pull-Up', sets: 4, reps: '6-10', restSeconds: 90, muscleGroup: 'Back', equipment: 'Pull-up Bar', description: 'Hang from bar, pull chest to bar squeezing lats', phase: 'strength' },
    { name: 'Barbell Row', sets: 4, reps: '8-10', restSeconds: 90, muscleGroup: 'Back', equipment: 'Barbell', description: 'Hinge at hips, row bar to lower chest keeping back flat', phase: 'strength' },
    { name: 'Lat Pulldown', sets: 3, reps: '10-12', restSeconds: 75, muscleGroup: 'Back', equipment: 'Cable Machine', description: 'Pull bar down to upper chest, lead with elbows', phase: 'strength' },
    { name: 'Seated Cable Row', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Back', equipment: 'Cable Machine', description: 'Row handle to lower abs, squeeze shoulder blades together', phase: 'strength' },
    { name: 'Single-Arm Dumbbell Row', sets: 3, reps: '10-12', restSeconds: 60, muscleGroup: 'Back', equipment: 'Dumbbells', description: 'Support on bench, row dumbbell to hip with elbow high', phase: 'strength' },
  ],
  Legs: [
    { name: 'Barbell Back Squat', sets: 4, reps: '6-8', restSeconds: 120, muscleGroup: 'Legs', equipment: 'Barbell', description: 'Bar on upper back, squat until thighs are parallel to floor', phase: 'strength' },
    { name: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 90, muscleGroup: 'Legs', equipment: 'Barbell', description: 'Push hips back, lower bar along legs until you feel hamstring stretch', phase: 'strength' },
    { name: 'Leg Press', sets: 3, reps: '12-15', restSeconds: 75, muscleGroup: 'Legs', equipment: 'Leg Press Machine', description: 'Press platform away, stop just before knees lock out', phase: 'strength' },
    { name: 'Walking Lunges', sets: 3, reps: '12 per leg', restSeconds: 75, muscleGroup: 'Legs', equipment: 'Dumbbells', description: 'Step forward and lower back knee toward floor, alternate legs', phase: 'strength' },
    { name: 'Leg Curl', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Legs', equipment: 'Machine', description: 'Curl heels toward glutes, control the descent', phase: 'strength' },
  ],
  Shoulders: [
    { name: 'Overhead Press', sets: 4, reps: '8-10', restSeconds: 90, muscleGroup: 'Shoulders', equipment: 'Barbell', description: 'Press bar from shoulders to lockout overhead, keep core tight', phase: 'strength' },
    { name: 'Lateral Raise', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Shoulders', equipment: 'Dumbbells', description: 'Raise arms to sides to shoulder height with slight bend in elbows', phase: 'strength' },
    { name: 'Front Raise', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Shoulders', equipment: 'Dumbbells', description: 'Raise one arm forward to shoulder height, alternate sides', phase: 'strength' },
    { name: 'Rear Delt Flye', sets: 3, reps: '15-20', restSeconds: 60, muscleGroup: 'Shoulders', equipment: 'Dumbbells', description: 'Bent over, raise arms out to sides squeezing rear delts', phase: 'strength' },
    { name: 'Arnold Press', sets: 3, reps: '10-12', restSeconds: 75, muscleGroup: 'Shoulders', equipment: 'Dumbbells', description: 'Start with palms facing you, rotate and press overhead simultaneously', phase: 'strength' },
  ],
  Arms: [
    { name: 'Barbell Curl', sets: 3, reps: '10-12', restSeconds: 60, muscleGroup: 'Arms', equipment: 'Barbell', description: 'Curl bar up to shoulders, keep elbows pinned at sides', phase: 'strength' },
    { name: 'Tricep Pushdown', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Arms', equipment: 'Cable Machine', description: 'Push rope or bar down until arms fully extend, squeeze triceps', phase: 'strength' },
    { name: 'Hammer Curl', sets: 3, reps: '10-12', restSeconds: 60, muscleGroup: 'Arms', equipment: 'Dumbbells', description: 'Neutral grip curl, keep thumbs pointing up throughout', phase: 'strength' },
    { name: 'Skull Crusher', sets: 3, reps: '10-12', restSeconds: 75, muscleGroup: 'Arms', equipment: 'Barbell', description: 'Lower bar to forehead bending at elbows, press back up', phase: 'strength' },
    { name: 'Concentration Curl', sets: 3, reps: '12-15', restSeconds: 45, muscleGroup: 'Arms', equipment: 'Dumbbells', description: 'Seated, brace elbow on inner thigh and curl fully', phase: 'strength' },
  ],
  Core: [
    { name: 'Plank', sets: 3, reps: '45 sec', restSeconds: 60, muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Hold body in a straight line from head to heels', phase: 'strength' },
    { name: 'Hanging Knee Raise', sets: 3, reps: '12-15', restSeconds: 60, muscleGroup: 'Core', equipment: 'Pull-up Bar', description: 'Hang and draw knees to chest in a controlled arc', phase: 'strength' },
    { name: 'Cable Crunch', sets: 3, reps: '15-20', restSeconds: 60, muscleGroup: 'Core', equipment: 'Cable Machine', description: 'Kneel, crunch ribs toward pelvis against cable resistance', phase: 'strength' },
    { name: 'Ab Wheel Rollout', sets: 3, reps: '10-12', restSeconds: 75, muscleGroup: 'Core', equipment: 'Ab Wheel', description: 'Roll forward from knees, keep hips low, roll back in', phase: 'strength' },
    { name: 'Russian Twist', sets: 3, reps: '20 total', restSeconds: 45, muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Lean back slightly, rotate torso side to side with weight', phase: 'strength' },
  ],
  Glutes: [
    { name: 'Hip Thrust', sets: 4, reps: '10-12', restSeconds: 90, muscleGroup: 'Glutes', equipment: 'Barbell', description: 'Shoulders on bench, drive hips up and squeeze at the top', phase: 'strength' },
    { name: 'Sumo Deadlift', sets: 4, reps: '6-8', restSeconds: 120, muscleGroup: 'Glutes', equipment: 'Barbell', description: 'Wide stance, toes out, drive hips forward to lockout', phase: 'strength' },
    { name: 'Cable Kickback', sets: 3, reps: '15 per leg', restSeconds: 60, muscleGroup: 'Glutes', equipment: 'Cable Machine', description: 'On all fours, kick straight leg back and up, squeeze glute', phase: 'strength' },
    { name: 'Bulgarian Split Squat', sets: 3, reps: '10 per leg', restSeconds: 75, muscleGroup: 'Glutes', equipment: 'Dumbbells', description: 'Rear foot elevated, lower back knee toward floor', phase: 'strength' },
    { name: 'Glute Bridge', sets: 3, reps: '15-20', restSeconds: 60, muscleGroup: 'Glutes', equipment: 'Bodyweight', description: 'Lie on back, drive hips up and hold for 1 sec at top', phase: 'strength' },
  ],
  'Full Body': [
    { name: 'Deadlift', sets: 4, reps: '5-6', restSeconds: 120, muscleGroup: 'Full Body', equipment: 'Barbell', description: 'Hinge at hips, grip bar, drive through floor to full lockout', phase: 'strength' },
    { name: 'Power Clean', sets: 4, reps: '5', restSeconds: 120, muscleGroup: 'Full Body', equipment: 'Barbell', description: 'Explosive pull from floor, shrug and drop under bar to catch', phase: 'strength' },
    { name: 'Kettlebell Swing', sets: 4, reps: '15-20', restSeconds: 75, muscleGroup: 'Full Body', equipment: 'Kettlebell', description: 'Hip hinge, swing kettlebell to shoulder height with hip drive', phase: 'strength' },
    { name: 'Burpee', sets: 3, reps: '10-15', restSeconds: 75, muscleGroup: 'Full Body', equipment: 'Bodyweight', description: 'Drop to push-up, jump feet in, explode up with jump', phase: 'strength' },
    { name: 'Thrusters', sets: 3, reps: '10-12', restSeconds: 90, muscleGroup: 'Full Body', equipment: 'Dumbbells', description: 'Front squat into overhead press in one fluid movement', phase: 'strength' },
    { name: 'Box Jump', sets: 3, reps: '8-10', restSeconds: 90, muscleGroup: 'Full Body', equipment: 'Box', description: 'Dip, swing arms, jump onto box with soft knees, step down', phase: 'strength' },
  ],
}

// Cardio exercises — always present, tagged as 'cardio' phase
const CARDIO_EXERCISES: ExerciseTemplate[] = [
  { name: 'Treadmill Intervals', sets: 1, reps: '15 min', restSeconds: 0, muscleGroup: 'Cardio', equipment: 'Treadmill', description: 'Alternate 1 min sprint / 1 min walk. Keeps heart rate in fat-burning zone.', phase: 'cardio' },
  { name: 'Jump Rope', sets: 3, reps: '2 min', restSeconds: 30, muscleGroup: 'Cardio', equipment: 'Jump Rope', description: 'Maintain a steady rhythm. Mix in double-unders once warm. Great low-impact finisher.', phase: 'cardio' },
  { name: 'Rowing Machine', sets: 3, reps: '500 m', restSeconds: 60, muscleGroup: 'Cardio', equipment: 'Rower', description: 'Drive with legs first, lean back, pull handle to lower chest. Full-body aerobic effort.', phase: 'cardio' },
  { name: 'Battle Ropes', sets: 4, reps: '30 sec', restSeconds: 30, muscleGroup: 'Cardio', equipment: 'Battle Ropes', description: 'Alternate arm slams at maximum effort. Rest 30 s between rounds.', phase: 'cardio' },
  { name: 'Cycling Sprint', sets: 4, reps: '45 sec', restSeconds: 45, muscleGroup: 'Cardio', equipment: 'Bodyweight', description: 'On a bike or air bike, sprint at maximum RPM then recover. Great for HIIT conditioning.', phase: 'cardio' },
]

// Maps user-friendly equipment names to exercise library equipment values
const EQUIPMENT_MAP: Record<string, string[]> = {
  Barbell:        ['Barbell'],
  Dumbbells:      ['Dumbbells', 'Dumbbell'],
  'Cable Machine': ['Cable Machine'],
  Kettlebell:     ['Kettlebell'],
  'Pull-up Bar':  ['Pull-up Bar'],
  'Leg Press Machine': ['Leg Press Machine'],
  Machine:        ['Machine', 'Leg Press Machine'],
  'Ab Wheel':     ['Ab Wheel'],
  Box:            ['Box'],
  'Battle Ropes': ['Battle Ropes'],
  'Jump Rope':    ['Jump Rope'],
  Treadmill:      ['Treadmill'],
  Rower:          ['Rower'],
  Bodyweight:     ['Bodyweight'],
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Fat-Burning',
  muscle_gain: 'Muscle-Building',
  endurance: 'Endurance',
  strength: 'Strength',
  toning: 'Toning',
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Simple keyword → excluded exercises map for wishes processing
const WISHES_EXCLUDE: { keywords: string[]; excludeNames: string[] }[] = [
  { keywords: ['колен', 'knee'],    excludeNames: ['Barbell Back Squat', 'Walking Lunges', 'Bulgarian Split Squat', 'Box Jump'] },
  { keywords: ['спин', 'back pain', 'поясниц'], excludeNames: ['Deadlift', 'Barbell Row', 'Romanian Deadlift', 'Sumo Deadlift'] },
  { keywords: ['плеч', 'shoulder'], excludeNames: ['Overhead Press', 'Arnold Press', 'Front Raise', 'Lateral Raise'] },
  { keywords: ['бег', 'run', 'treadmill'], excludeNames: ['Treadmill Intervals'] },
  { keywords: ['прыж', 'jump'],     excludeNames: ['Box Jump', 'Burpee', 'Jump Rope'] },
]

function getExcludedByWishes(wishes: string): Set<string> {
  const lower = wishes.toLowerCase()
  const excluded = new Set<string>()
  for (const rule of WISHES_EXCLUDE) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      rule.excludeNames.forEach(n => excluded.add(n))
    }
  }
  return excluded
}

// Keywords that indicate the user wants extra emphasis on glutes/core/etc.
const WISHES_EMPHASIZE: { keywords: string[]; muscle: string }[] = [
  { keywords: ['ягодиц', 'glute', 'попа', 'попу'],  muscle: 'Glutes' },
  { keywords: ['пресс', 'живот', 'core'],            muscle: 'Core' },
  { keywords: ['руки', 'бицепс', 'трицепс', 'arm'], muscle: 'Arms' },
]

function getEmphasizedMuscle(wishes: string): string | null {
  const lower = wishes.toLowerCase()
  for (const rule of WISHES_EMPHASIZE) {
    if (rule.keywords.some(kw => lower.includes(kw))) return rule.muscle
  }
  return null
}

function computeAllowedEquipment(availableEquipment: string[]): Set<string> {
  // Build flat set of allowed equipment values from user selection.
  // If nothing selected, allow everything (bodyweight fallback).
  const alwaysAllowed = new Set(['Bodyweight'])
  return availableEquipment.length === 0
    ? new Set(Object.values(EQUIPMENT_MAP).flat())
    : new Set([
        ...alwaysAllowed,
        ...availableEquipment.flatMap(eq => EQUIPMENT_MAP[eq] ?? [eq]),
      ])
}

function buildTemplateDays(
  goal: string,
  targetMuscles: string[],
  sessionsPerWeek: number,
  availableEquipment: string[],
  wishes: string,
): WorkoutDay[] {
  const goalLabel = GOAL_LABELS[goal] ?? goal
  const muscles = targetMuscles.includes('Full Body') ? ['Full Body'] : targetMuscles

  const allowedEquipment = computeAllowedEquipment(availableEquipment)

  const excludedByWishes = getExcludedByWishes(wishes)
  const emphasizedMuscle = getEmphasizedMuscle(wishes)

  const filterByEquipment = (exs: ExerciseTemplate[]): ExerciseTemplate[] =>
    exs.filter(e => allowedEquipment.has(e.equipment) && !excludedByWishes.has(e.name))

  const wantsCardio = goal === 'weight_loss' || goal === 'endurance'
  const isStrength = goal === 'strength'

  const days: WorkoutDay[] = []

  // Build rotation: if a muscle is emphasized via wishes, inject it every other day
  const rotation: string[] = []
  for (let i = 0; i < sessionsPerWeek; i++) {
    if (emphasizedMuscle && i % 2 === 1 && !muscles.includes(emphasizedMuscle)) {
      rotation.push(emphasizedMuscle)
    } else {
      rotation.push(muscles[i % muscles.length])
    }
  }

  for (let i = 0; i < sessionsPerWeek; i++) {
    const primaryMuscle = rotation[i]
    const rawLibrary = EXERCISE_LIBRARY[primaryMuscle] ?? EXERCISE_LIBRARY['Full Body']

    // ── 1. Warmup (2 exercises, bodyweight, always included) ──────────────────
    const warmupPool = filterByEquipment(WARMUP_EXERCISES)
    const warmups = (warmupPool.length >= 2 ? warmupPool : WARMUP_EXERCISES).slice(0, 2)

    // ── 2. Main strength block (3-5 exercises) ─────────────────────────────────
    let library = filterByEquipment(rawLibrary)
    if (library.length === 0) library = filterByEquipment(EXERCISE_LIBRARY['Full Body'])
    if (library.length === 0) library = EXERCISE_LIBRARY['Full Body'].filter(e => e.equipment === 'Bodyweight')

    let mainExercises: ExerciseTemplate[]
    if (isStrength) {
      mainExercises = library.slice(0, 4).map(e => ({
        ...e,
        sets: Math.min(e.sets + 1, 5),
        reps: '4-6',
        restSeconds: 120,
      }))
    } else {
      mainExercises = library.slice(0, 4)
    }

    // ── 3. Cardio finisher (1 exercise, always included) ──────────────────────
    const cardioPool = filterByEquipment(CARDIO_EXERCISES)
    const availableCardio = cardioPool.length > 0 ? cardioPool : CARDIO_EXERCISES.filter(e => e.equipment === 'Bodyweight')
    // Weight-loss/endurance gets a harder cardio block; strength/muscle gets lighter
    const cardioExercise = wantsCardio
      ? availableCardio[i % availableCardio.length]
      : { ...availableCardio[i % availableCardio.length], sets: 2, reps: '1 min' }

    // ── 4. Cooldown (2 exercises, bodyweight, always included) ────────────────
    const cooldowns = COOLDOWN_EXERCISES.slice(i % 2, (i % 2) + 2)

    const exercises: ExerciseTemplate[] = [
      ...warmups,
      ...mainExercises,
      cardioExercise,
      ...cooldowns,
    ]

    const estimatedMinutes = exercises.reduce((acc, e) => {
      const workTime = e.sets * 60
      const restTime = e.sets * e.restSeconds
      return acc + Math.round((workTime + restTime) / 60)
    }, 0)

    days.push({
      dayName: DAY_NAMES[i % 7],
      focus: `${goalLabel} — ${primaryMuscle}`,
      exercises,
      estimatedMinutes,
    })
  }

  return days
}

export async function generateWorkoutPlan(input: GeneratePlanInput) {
  const userId = await getUserId()

  const templateDays = (input.customDays && input.customDays.length > 0)
    ? input.customDays.map(recomputeDayMinutes)
    : buildTemplateDays(
        input.goal,
        input.targetMuscles,
        input.sessionsPerWeek,
        input.availableEquipment,
        input.wishes,
      )

  const goalLabel = GOAL_LABELS[input.goal] ?? input.goal
  const muscles = input.targetMuscles.join(', ')
  const wishSuffix = input.wishes.trim() ? ` · ${input.wishes.trim().slice(0, 40)}` : ''
  const wkLabel = input.lang === 'ru' ? 'нед' : 'wk'
  const title = `${goalLabel} Plan — ${muscles} (${input.durationWeeks} ${wkLabel}${wishSuffix})`

  const planId = generateId()
  await db.insert(workoutPlan).values({
    id: planId,
    userId,
    title,
    goal: input.goal,
    durationWeeks: input.durationWeeks,
    sessionsPerWeek: input.sessionsPerWeek,
    startDate: input.startDate,
    planJson: { title, days: templateDays, wishes: input.wishes } as unknown as Record<string, unknown>,
  })

  // Schedule sessions on the exact user-chosen weekdays
  // trainingDays: sorted array of weekday numbers (0=Sun…6=Sat)
  const sortedDays = [...input.trainingDays].sort((a, b) => a - b)
  const start = new Date(input.startDate + 'T00:00:00')

  // For each chosen weekday compute how many days after startDate it falls in week 0
  // If the weekday is before startDate's weekday, put it in week 1
  function nextOccurrence(targetDow: number, fromDate: Date): Date {
    const diff = (targetDow - fromDate.getDay() + 7) % 7
    const d = new Date(fromDate)
    d.setDate(fromDate.getDate() + diff)
    return d
  }

  const sessions: {
    id: string
    userId: string
    planId: string
    scheduledDate: string
    completed: boolean
    exercisesJson: unknown
  }[] = []

  for (let week = 0; week < input.durationWeeks; week++) {
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() + week * 7)

    sortedDays.forEach((dow, dayIndex) => {
      const sessionDate = nextOccurrence(dow, weekStart)
      sessions.push({
        id: generateId(),
        userId,
        planId,
        scheduledDate: toDateString(sessionDate),
        completed: false,
        exercisesJson: templateDays[dayIndex % templateDays.length].exercises as unknown as Record<string, unknown>,
      })
    })
  }

  for (const s of sessions) {
    await db.insert(workoutSession).values(s)
  }

  revalidatePath('/')
  return planId
}

// Local (timezone-safe) YYYY-MM-DD formatting.
function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getActivePlan() {
  const userId = await getUserId()
  const plans = await db
    .select()
    .from(workoutPlan)
    .where(eq(workoutPlan.userId, userId))
    .orderBy(desc(workoutPlan.createdAt))
    .limit(1)
  return plans[0] ?? null
}

export async function getAllPlans() {
  const userId = await getUserId()
  return db
    .select()
    .from(workoutPlan)
    .where(eq(workoutPlan.userId, userId))
    .orderBy(desc(workoutPlan.createdAt))
}

export async function getPlanById(planId: string) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(workoutPlan)
    .where(and(eq(workoutPlan.id, planId), eq(workoutPlan.userId, userId)))
    .limit(1)
  const plan = rows[0] ?? null
  if (!plan) return null
  const json = plan.planJson as { title?: string; days?: WorkoutDay[] } | null
  const days: WorkoutDay[] = json?.days ?? []
  return { planId: plan.id, title: plan.title, goal: plan.goal, days }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessionsForPlan(planId: string) {
  const userId = await getUserId()
  return db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.planId, planId), eq(workoutSession.userId, userId)))
    .orderBy(workoutSession.scheduledDate)
}

export async function getAllSessionsForUser() {
  const userId = await getUserId()
  return db
    .select()
    .from(workoutSession)
    .where(eq(workoutSession.userId, userId))
    .orderBy(workoutSession.scheduledDate)
}

export type ExerciseEffort = {
  feeling: 'easy' | 'normal' | 'hard'
  score: number       // 1-10
  completedSets?: number // if not all sets done
}

export async function completeWorkoutSession(
  sessionId: string,
  notes?: string,
  effortData?: Record<string, ExerciseEffort>,
) {
  const userId = await getUserId()
  await db
    .update(workoutSession)
    .set({
      completed: true,
      completedAt: new Date(),
      notes: notes ?? null,
      ...(effortData ? { effortData } : {}),
    })
    .where(and(eq(workoutSession.id, sessionId), eq(workoutSession.userId, userId)))
  revalidatePath('/')
}

export async function uncompleteWorkoutSession(sessionId: string) {
  const userId = await getUserId()
  await db
    .update(workoutSession)
    .set({ completed: false, completedAt: null })
    .where(and(eq(workoutSession.id, sessionId), eq(workoutSession.userId, userId)))
  revalidatePath('/')
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export async function logExerciseProgress(data: {
  sessionId: string
  exerciseName: string
  sets: number
  reps: number
  weight?: number
  duration?: number
}) {
  const userId = await getUserId()
  await db.insert(progressLog).values({
    id: generateId(),
    userId,
    ...data,
    weight: data.weight?.toString(),
  })
  revalidatePath('/')
}

export async function getProgressLogs() {
  const userId = await getUserId()
  return db
    .select()
    .from(progressLog)
    .where(eq(progressLog.userId, userId))
    .orderBy(desc(progressLog.loggedAt))
    .limit(50)
}

// ─── Plan preview & customization (constructor) ─────────────────────────────────

function recomputeDayMinutes(day: WorkoutDay): WorkoutDay {
  const estimatedMinutes = day.exercises.reduce((acc, e) => {
    const workTime = e.sets * 60
    const restTime = e.sets * e.restSeconds
    return acc + Math.round((workTime + restTime) / 60)
  }, 0)
  return { ...day, estimatedMinutes }
}

export type PlanPreview = {
  days: WorkoutDay[]
  /** Extra exercises the user can add to each day, indexed by day */
  alternativesByDay: Exercise[][]
}

/**
 * Builds a plan preview WITHOUT persisting it. Returns the generated days plus,
 * for each day, a pool of alternative exercises (matching equipment) that the
 * user can add via the constructor UI.
 */
export async function previewWorkoutPlan(input: GeneratePlanInput): Promise<PlanPreview> {
  await getUserId()

  const days = buildTemplateDays(
    input.goal,
    input.targetMuscles,
    input.sessionsPerWeek,
    input.availableEquipment,
    input.wishes,
  )

  const allowedEquipment = computeAllowedEquipment(input.availableEquipment)
  const excluded = getExcludedByWishes(input.wishes)

  const alternativesByDay = days.map(day => {
    const selectedNames = new Set(day.exercises.map(e => e.name))
    const alts: Exercise[] = []

    // Strength alternatives from every muscle library
    for (const templates of Object.values(EXERCISE_LIBRARY)) {
      for (const t of templates) {
        if (
          allowedEquipment.has(t.equipment) &&
          !excluded.has(t.name) &&
          !selectedNames.has(t.name)
        ) {
          alts.push({ ...t })
        }
      }
    }
    // Cardio alternatives
    for (const t of CARDIO_EXERCISES) {
      if (allowedEquipment.has(t.equipment) && !selectedNames.has(t.name)) {
        alts.push({ ...t })
      }
    }
    return alts
  })

  return { days, alternativesByDay }
}

// ─── Coach: read & edit the active plan ─────────────────────────────────────────

export type PlanDaysResult = {
  planId: string
  title: string
  goal: string
  days: WorkoutDay[]
} | null

export async function getPlanDays(): Promise<PlanDaysResult> {
  const plan = await getActivePlan()
  if (!plan) return null
  const json = plan.planJson as { title?: string; days?: WorkoutDay[] }
  return {
    planId: plan.id,
    title: plan.title,
    goal: plan.goal,
    days: (json.days ?? []).map(recomputeDayMinutes),
  }
}

/**
 * Persists edited plan days and rebuilds every future (uncompleted) session so
 * changes made by the AI coach propagate to the whole schedule. Completed and
 * past sessions are left untouched to preserve history.
 */
export async function applyPlanDays(planId: string, days: WorkoutDay[]) {
  const userId = await getUserId()

  const cleanDays = days.map(recomputeDayMinutes)

  // Update the stored plan template
  const plans = await db
    .select()
    .from(workoutPlan)
    .where(and(eq(workoutPlan.id, planId), eq(workoutPlan.userId, userId)))
  const plan = plans[0]
  if (!plan) throw new Error('Plan not found')

  const existingJson = (plan.planJson as Record<string, unknown>) ?? {}
  await db
    .update(workoutPlan)
    .set({ planJson: { ...existingJson, days: cleanDays } as Record<string, unknown> })
    .where(and(eq(workoutPlan.id, planId), eq(workoutPlan.userId, userId)))

  // Rebuild future sessions. Sessions were created week-by-week, day-by-day in
  // sorted order, so ordering by date matches creation order and dayIndex is
  // position % dayCount.
  const allSessions = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.planId, planId), eq(workoutSession.userId, userId)))
    .orderBy(workoutSession.scheduledDate)

  const dayCount = cleanDays.length
  if (dayCount === 0) return

  const today = toDateString(new Date())

  for (let i = 0; i < allSessions.length; i++) {
    const s = allSessions[i]
    if (s.completed || s.scheduledDate < today) continue
    const dayIndex = i % dayCount
    await db
      .update(workoutSession)
      .set({ exercisesJson: cleanDays[dayIndex].exercises as unknown as Record<string, unknown> })
      .where(and(eq(workoutSession.id, s.id), eq(workoutSession.userId, userId)))
  }

  revalidatePath('/')
  revalidatePath('/calendar')
}

// ─── Overdue / Catch-up ───────────────────────────────────────────────────────

/**
 * Called when the user acknowledges missed workouts.
 * 1. Marks all uncompleted sessions whose scheduledDate is strictly before today
 *    as skipped (sets a note, but leaves completed=false so they stay red in history).
 * 2. Boosts the next upcoming session's exercises by +20% sets/reps to help
 *    the user catch up — capped so sets ≤ 6 and reps are bumped by one step.
 */
export async function boostMissedSessions(planId: string) {
  const userId = await getUserId()
  const today = toDateString(new Date())

  // 1. Find all missed (past, uncompleted) sessions for this plan
  const missed = await db
    .select()
    .from(workoutSession)
    .where(
      and(
        eq(workoutSession.planId, planId),
        eq(workoutSession.userId, userId),
        eq(workoutSession.completed, false),
        lt(workoutSession.scheduledDate, today),
      ),
    )

  if (missed.length === 0) return { boosted: false }

  // Mark them with a skipped note (does not flip completed so they stay red)
  for (const s of missed) {
    await db
      .update(workoutSession)
      .set({ notes: '__skipped__' })
      .where(and(eq(workoutSession.id, s.id), eq(workoutSession.userId, userId)))
  }

  // 2. Find the very next upcoming session
  const upcoming = await db
    .select()
    .from(workoutSession)
    .where(
      and(
        eq(workoutSession.planId, planId),
        eq(workoutSession.userId, userId),
        eq(workoutSession.completed, false),
        gte(workoutSession.scheduledDate, today),
      ),
    )
    .orderBy(workoutSession.scheduledDate)
    .limit(1)

  if (upcoming.length === 0) return { boosted: false }

  const next = upcoming[0]
  const exercises = (next.exercisesJson as Exercise[]) ?? []

  // Boost strength/cardio exercises: +1 set (max 6), bump reps string by ~20%
  const boosted = exercises.map(ex => {
    if (ex.phase === 'warmup' || ex.phase === 'cooldown') return ex
    const newSets = Math.min((ex.sets ?? 3) + 1, 6)
    const newReps = boostRepsString(ex.reps ?? '')
    return { ...ex, sets: newSets, reps: newReps, _boosted: true }
  })

  await db
    .update(workoutSession)
    .set({
      exercisesJson: boosted as unknown as Record<string, unknown>,
      notes: '__boosted__',
    })
    .where(and(eq(workoutSession.id, next.id), eq(workoutSession.userId, userId)))

  revalidatePath('/')
  revalidatePath('/calendar')
  return { boosted: true, sessionId: next.id }
}

/** Bumps a reps string like "8-10" → "10-12", "12-15" → "15-18", "30 sec" → "35 sec" */
function boostRepsString(reps: string): string {
  // "X-Y" range → add ~2 to each bound
  const rangeMatch = reps.match(/^(\d+)-(\d+)(.*)$/)
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1]) + 2
    const hi = parseInt(rangeMatch[2]) + 2
    return `${lo}-${hi}${rangeMatch[3]}`
  }
  // "N sec" → add 10%
  const secMatch = reps.match(/^(\d+)(\s*sec.*)$/i)
  if (secMatch) {
    const val = Math.round(parseInt(secMatch[1]) * 1.15)
    return `${val}${secMatch[2]}`
  }
  // Plain number → add 2
  const numMatch = reps.match(/^(\d+)(.*)$/)
  if (numMatch) {
    return `${parseInt(numMatch[1]) + 2}${numMatch[2]}`
  }
  return reps
}
