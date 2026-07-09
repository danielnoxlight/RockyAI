import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getAllPlans, getAllSessionsForUser } from '@/app/actions/fitness'
import { CalendarView } from '@/components/calendar-view'

export default async function CalendarPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [plans, rawSessions] = await Promise.all([
    getAllPlans(),
    getAllSessionsForUser(),
  ])

  const sessions = rawSessions.map(s => ({
    ...s,
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
  }))

  return <CalendarView plans={plans} sessions={sessions} />
}
