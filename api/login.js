import { SignJWT } from 'jose'
import { vpsCall } from './_vps.js'

const JWT_SECRET = process.env.JWT_SECRET || "domino-jwt-y8h3s1f4d7a2e5g0n9m6k3w1"
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

  const { account_code, password } = req.body || {}

  if (!account_code || !password) {
    return res.status(400).json({ error: 'account_code and password are required' })
  }

  try {
    const data = await vpsCall('POST', '/internal/user/authenticate', { account_code, password })

    if (!data.user_id) {
      return res.status(401).json({ error: 'Неверный код или пароль' })
    }

    const token = await new SignJWT({ user_id: data.user_id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    return res.status(200).json({
      token,
      user_id: data.user_id,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
