import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

// From address. Use your verified domain in production, e.g. "RockyAI <noreply@yourdomain.com>".
// Resend's onboarding domain works for testing without a verified domain.
const FROM_ADDRESS = process.env.RESEND_FROM ?? 'RockyAI <onboarding@resend.dev>'

export async function sendPasswordResetEmail({
  to,
  url,
  userName,
}: {
  to: string
  url: string
  userName?: string
}) {
  if (!resendApiKey) {
    // No API key yet (e.g. local/dev before final deploy).
    // Log the link so the flow is still testable without sending real email.
    console.log('[v0] RESEND_API_KEY not set. Password reset link for', to, ':', url)
    return
  }

  const resend = new Resend(resendApiKey)

  const greeting = userName ? `Hi ${userName},` : 'Hi,'

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Reset your RockyAI password',
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #111;">Reset your password</h1>
        <p style="font-size: 15px; color: #444; line-height: 1.6;">${greeting}</p>
        <p style="font-size: 15px; color: #444; line-height: 1.6;">
          We received a request to reset your RockyAI password. Click the button below to choose a new one. This link expires in 1 hour.
        </p>
        <p style="margin: 28px 0;">
          <a href="${url}" style="background: #111; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 15px; display: inline-block;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; color: #888; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
        <p style="font-size: 13px; color: #888; line-height: 1.6; word-break: break-all;">
          Or paste this link into your browser:<br />${url}
        </p>
      </div>
    `,
  })
}
