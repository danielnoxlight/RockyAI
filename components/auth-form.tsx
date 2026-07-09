'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useTranslation } from '@/lib/i18n'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { t } = useTranslation()
  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4">
            <img src="/logo.png" alt="RockyAI" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">RockyAI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? t.auth.signUp : t.auth.signIn}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/40">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-foreground text-sm font-medium">{t.auth.nameLabel}</Label>
                <Input
                  id="name"
                  placeholder={t.auth.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-foreground text-sm font-medium">{t.auth.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-foreground text-sm font-medium">{t.auth.passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t.auth.passwordHint}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl mt-2"
            >
              {loading ? t.auth.loading : isSignUp ? t.auth.createAccount : t.auth.signInBtn}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-5">
            {isSignUp ? t.auth.alreadyHave : t.auth.noAccount}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              {isSignUp ? t.auth.signInLink : t.auth.signUpLink}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
