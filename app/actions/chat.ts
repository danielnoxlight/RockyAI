'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatMessage, chatThread } from '@/lib/db/schema'
import { eq, and, asc, desc, sql } from 'drizzle-orm'
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

// Ensure both tables exist (idempotent)
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
    // Add threadId column if missing on old installs
    await db.execute(sql`
      ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS "threadId" TEXT NOT NULL DEFAULT 'default'
    `)
  } catch {
    // ignore
  }
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export type ThreadSummary = {
  id: string
  title: string
  createdAt: Date
}

export async function getThreads(): Promise<ThreadSummary[]> {
  const userId = await getUserId()
  await ensureTables()
  const rows = await db
    .select()
    .from(chatThread)
    .where(eq(chatThread.userId, userId))
    .orderBy(desc(chatThread.createdAt))
    .limit(50)
  return rows.map(r => ({ id: r.id, title: r.title, createdAt: r.createdAt }))
}

export async function createThread(title = 'New chat'): Promise<string> {
  const userId = await getUserId()
  await ensureTables()
  const id = generateId()
  await db.insert(chatThread).values({ id, userId, title })
  revalidatePath('/coach')
  return id
}

export async function renameThread(threadId: string, title: string): Promise<void> {
  const userId = await getUserId()
  await db
    .update(chatThread)
    .set({ title })
    .where(and(eq(chatThread.id, threadId), eq(chatThread.userId, userId)))
  revalidatePath('/coach')
}

export async function deleteThread(threadId: string): Promise<void> {
  const userId = await getUserId()
  await db
    .delete(chatMessage)
    .where(and(eq(chatMessage.threadId, threadId), eq(chatMessage.userId, userId)))
  await db
    .delete(chatThread)
    .where(and(eq(chatThread.id, threadId), eq(chatThread.userId, userId)))
  revalidatePath('/coach')
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type ChatHistoryItem = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export async function getThreadMessages(threadId: string): Promise<ChatHistoryItem[]> {
  const userId = await getUserId()
  await ensureTables()
  const rows = await db
    .select()
    .from(chatMessage)
    .where(and(eq(chatMessage.threadId, threadId), eq(chatMessage.userId, userId)))
    .orderBy(asc(chatMessage.createdAt))
    .limit(300)
  return rows.map(r => ({
    id: r.id,
    role: r.role as 'user' | 'assistant',
    content: r.content,
    createdAt: r.createdAt,
  }))
}

export async function saveThreadMessages(
  threadId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<void> {
  const userId = await getUserId()
  await ensureTables()
  for (const m of messages) {
    await db.insert(chatMessage).values({
      id: generateId(),
      userId,
      threadId,
      role: m.role,
      content: m.content,
    })
  }
  // Auto-title the thread from the first user message if title is default
  if (messages.length > 0) {
    const firstUserMsg = messages.find(m => m.role === 'user')
    if (firstUserMsg) {
      const threads = await db
        .select()
        .from(chatThread)
        .where(and(eq(chatThread.id, threadId), eq(chatThread.userId, userId)))
        .limit(1)
      if (threads[0]?.title === 'Новый чат' || threads[0]?.title === 'New chat') {
        const autoTitle = firstUserMsg.content.slice(0, 50).trim()
        if (autoTitle) {
          await db
            .update(chatThread)
            .set({ title: autoTitle })
            .where(and(eq(chatThread.id, threadId), eq(chatThread.userId, userId)))
        }
      }
    }
  }
}

export async function clearThreadMessages(threadId: string): Promise<void> {
  const userId = await getUserId()
  await ensureTables()
  await db
    .delete(chatMessage)
    .where(and(eq(chatMessage.threadId, threadId), eq(chatMessage.userId, userId)))
  revalidatePath('/coach')
}

// Legacy – kept for backwards compat (used by old route.ts)
export async function getChatHistory(): Promise<ChatHistoryItem[]> {
  return getThreadMessages('default')
}

export async function clearChatHistory(): Promise<void> {
  return clearThreadMessages('default')
}
