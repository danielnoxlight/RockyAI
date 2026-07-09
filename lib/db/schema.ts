import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  date,
  jsonb,
} from 'drizzle-orm/pg-core'

// Better Auth required tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// App tables
export const profile = pgTable('profile', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  age: integer('age'),
  gender: text('gender'),
  height: numeric('height', { precision: 5, scale: 1 }),
  weight: numeric('weight', { precision: 5, scale: 1 }),
  fitnessLevel: text('fitnessLevel'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const workoutPlan = pgTable('workout_plan', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  goal: text('goal').notNull(),
  durationWeeks: integer('durationWeeks').notNull(),
  sessionsPerWeek: integer('sessionsPerWeek').notNull(),
  startDate: date('startDate').notNull(),
  planJson: jsonb('planJson').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const workoutSession = pgTable('workout_session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  planId: text('planId').notNull(),
  scheduledDate: date('scheduledDate').notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completedAt'),
  notes: text('notes'),
  exercisesJson: jsonb('exercisesJson').notNull(),
  // Stores per-exercise effort ratings: { [exerciseName]: { feeling: 'easy'|'normal'|'hard', score: 1-10, completedSets?: number } }
  effortData: jsonb('effortData'),
})

export const progressLog = pgTable('progress_log', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  sessionId: text('sessionId').notNull(),
  exerciseName: text('exerciseName').notNull(),
  sets: integer('sets'),
  reps: integer('reps'),
  weight: numeric('weight', { precision: 6, scale: 2 }),
  duration: integer('duration'),
  loggedAt: timestamp('loggedAt').notNull().defaultNow(),
})

export const chatThread = pgTable('chat_thread', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull().default('Новый чат'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const chatMessage = pgTable('chat_message', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  threadId: text('threadId').notNull().default('default'),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export type Profile = typeof profile.$inferSelect
export type WorkoutPlan = typeof workoutPlan.$inferSelect
export type WorkoutSession = typeof workoutSession.$inferSelect
export type ProgressLog = typeof progressLog.$inferSelect
export type ChatThread = typeof chatThread.$inferSelect
export type ChatMessage = typeof chatMessage.$inferSelect
