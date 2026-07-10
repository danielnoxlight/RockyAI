'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/i18n'

export function ResetPasswordForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const urlError = searchParams.get('error')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenInvalid = !token || urlError === 'invalid_token'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError(t.auth.passwordsNoMatch)
      return
    }

    setLoading(true)

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token as string,
    })

    setLoading(false)

    if (error) {
      setError(error.message ?? t.auth.invalidToken)
      return
    }

    setDone(true)
    setTimeout(() => {
      router.push('/sign-in')
      router.refresh()
    }, 1500)
  }

  return (
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4">
            <img src="/logo.png" alt="RockyAI" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t.auth.resetTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center text-pretty">{t.auth.resetDesc}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/40">
          {tokenInvalid ? (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-3 text-pretty" role="alert">
                {t.auth.invalidToken}
              </p>
              <Link
                href="/forgot-password"
                className="text-sm text-primary font-medium hover:underline underline-offset-4 text-center"
              >
                {t.auth.forgotTitle}
              </Link>
            </div>
          ) : done ? (
            <p className="text-sm text-foreground bg-secondary border border-border rounded-lg px-3 py-3 text-pretty" role="status">
              {t.auth.resetSuccess}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-foreground text-sm font-medium">{t.auth.newPasswordLabel}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.auth.passwordHint}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm" className="text-foreground text-sm font-medium">{t.auth.confirmPasswordLabel}</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder={t.auth.passwordHint}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                {loading ? t.auth.resetting : t.auth.resetBtn}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
