import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getProfile } from '@/app/actions/fitness'
import { ProfileView } from '@/components/profile-view'

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const profile = await getProfile()

  return <ProfileView userName={session.user.name} userEmail={session.user.email} profile={profile} />
}
