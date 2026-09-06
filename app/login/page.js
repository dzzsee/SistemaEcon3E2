import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth.js'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const session = await requireAuth()
  if (session) redirect('/')
  return <LoginForm />
}