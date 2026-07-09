import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getActivePlan, getSessionsForPlan, getProgressLogs } from '@/app/actions/fitness'
import { ProgressView } from '@/components/progress-view'

export default async function ProgressPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const plan = await getActivePlan()
  const sessions = plan ? await getSessionsForPlan(plan.id) : []
  const logs = await getProgressLogs()

  return <ProgressView plan={plan} sessions={sessions} logs={logs} />
}
