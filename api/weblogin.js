import { SignJWT } from 'jose'
import crypto from 'crypto'
import { vpsCall } from './_vps.js'

const JWT_SECRET = process.env.JWT_SECRET || "domino-jwt-y8h3s1f4d7a2e5g0n9m6k3w1"
const BOT_TOKEN = process.env.BOT_TOKEN || "8735606800:AAHPxkDL60l0s9j-LLOMQETWnSJZWj3fet0"
const secret = new TextEncoder().encode(JWT_SECRET)

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function validateTelegramWebApp(initData, botToken) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  params.delete('hash')

  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const signature = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  return { valid: signature === hash, params, hash }
}

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, code, init_data } = req.body || {}

  // Telegram Mini App authentication
  if (action === 'telegram') {
    if (!init_data) return res.status(400).json({ error: 'init_data required' })

    try {
      const { valid, params } = validateTelegramWebApp(init_data, BOT_TOKEN)
      if (!valid) return res.status(401).json({ error: 'Invalid Telegram initData' })

      const authDate = parseInt(params.get('auth_date') || '0')
      const age = Math.floor(Date.now() / 1000) - authDate
      if (age >= 86400) return res.status(401).json({ error: 'Telegram initData expired' })

      const user = JSON.parse(params.get('user'))
      const telegramId = user.id

      const data = await vpsCall('POST', '/internal/weblogin-telegram', { telegram_id: telegramId })
      if (data.error) return res.status(400).json({ error: data.error })

      const token = await new SignJWT({ user_id: data.user_id })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(secret)

      return res.status(200).json({
        token,
        user_id: data.user_id,
        session_id: data.session_id,
        account_code: data.account_code,
        setup_done: data.setup_done
      })
    } catch (e) {
      console.error('weblogin telegram error:', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // Legacy code-based authentication
  if (!code) return res.status(400).json({ error: 'code required' })

  try {
    const data = await vpsCall('POST', '/internal/weblogin', { code })
    if (data.error) return res.status(400).json({ error: data.error })

    const token = await new SignJWT({ user_id: data.user_id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret)

    return res.status(200).json({
      token,
      user_id: data.user_id,
      session_id: data.session_id,
      account_code: data.account_code,
      setup_done: data.setup_done
    })
  } catch (e) {
    console.error('weblogin error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
