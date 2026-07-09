import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chat_message (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
