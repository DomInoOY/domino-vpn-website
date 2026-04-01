import { SignJWT } from 'jose'
import { vpsCall } from './_vps.js'

const JWT_SECRET = "domino-jwt-y8h3s1f4d7a2e5g0n9m6k3w1"
const secret = new TextEncoder().encode(JWT_SECRET)

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body || {}

  if (!password) {
    return res.status(400).json({ error: 'Password is required' })
  }

  try {
    const data = await vpsCall('POST', '/internal/user/create', { password })

    if (!data.user_id || !data.account_code) {
      return res.status(500).json({ error: data.error || 'Failed to create account' })
    }

    const token = await new SignJWT({ user_id: data.user_id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    return res.status(200).json({
      account_code: data.account_code,
      token,
      user_id: data.user_id,
      warning: "Сохрани код аккаунта! Без него восстановить аккаунт невозможно.",
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
