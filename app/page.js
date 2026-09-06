import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth.js'
import App from './App'

export default async function HomePage() {
  const session = await requireAuth()
  if (!session) redirect('/login')
  return <App username={session.username} />
}