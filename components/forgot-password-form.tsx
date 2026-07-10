'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/i18n'

export function ForgotPasswordForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })

    setLoading(false)

    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }

    // Always show success to avoid leaking which emails exist.
    setSent(true)
  }

  return (
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4">
            <img src="/logo.png" alt="RockyAI" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t.auth.forgotTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center text-pretty">{t.auth.forgotDesc}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/40">
          {sent ? (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-foreground bg-secondary border border-border rounded-lg px-3 py-3 text-pretty" role="status">
                {t.auth.resetSent}
              </p>
              <Link
                href="/sign-in"
                className="text-sm text-primary font-medium hover:underline underline-offset-4 text-center"
              >
                {t.auth.backToSignIn}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                {loading ? t.auth.sending : t.auth.sendResetBtn}
              </Button>

              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground hover:text-foreground text-center mt-1"
              >
                {t.auth.backToSignIn}
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
