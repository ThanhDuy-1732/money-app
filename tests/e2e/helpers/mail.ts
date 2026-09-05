/**
 * Reads the latest OTP for `email` from Inbucket (local Supabase mail catcher).
 * Retries up to 10 times with 1-second delays to handle async email delivery.
 */
export async function getLatestOtp(email: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`http://localhost:9000/api/v1/mailbox/${email}/messages`)
    const messages = (await res.json()) as Array<{ id: string }>
    if (messages.length > 0) {
      const latest = messages[messages.length - 1]
      const detail = await fetch(
        `http://localhost:9000/api/v1/mailbox/${email}/messages/${latest.id}`
      )
      const msg = (await detail.json()) as { body: { text: string } }
      const match = msg.body.text.match(/\b(\d{6})\b/)
      if (match) return match[1]
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`No OTP email found for ${email} after 10 seconds`)
}
