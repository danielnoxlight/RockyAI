import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getActivePlan, getAllPlans } from '@/app/actions/fitness'
import { getThreads, getThreadMessages, createThread, type ThreadSummary } from '@/app/actions/chat'
import { CoachChat } from '@/components/coach-chat'

export default async function CoachPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [plan, allPlans, rawThreads] = await Promise.all([
    getActivePlan(),
    getAllPlans().catch(() => []),
    getThreads().catch((): ThreadSummary[] => []),
  ])
  const threads: ThreadSummary[] = rawThreads

  // Get or create the default thread
  let activeThread: typeof threads[number] | null = threads[0] ?? null
  if (!activeThread) {
    const id = await createThread('New chat').catch(() => null)
    if (id) {
      const newThread = { id, title: 'New chat', createdAt: new Date() }
      threads.push(newThread)
      activeThread = newThread
    }
  }

  const activeThreadId = activeThread?.id ?? 'default'
  const history = activeThreadId !== 'default'
    ? await getThreadMessages(activeThreadId).catch(() => [])
    : []

  return (
    <CoachChat
      hasPlan={!!plan}
      initialActivePlanId={plan?.id ?? null}
      allPlans={allPlans.map(p => ({ id: p.id, title: p.title, goal: p.goal }))}
      initialThreads={threads}
      initialThreadId={activeThreadId}
      initialHistory={history}
    />
  )
}
