import { SignJWT } from 'jose'
import { verifyToken } from './_auth.js'
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
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  const { action } = body
  if (!action) return res.status(400).json({ error: 'action required' })

  // ── register: no auth needed ──────────────────────────────────────────────
  if (action === 'register') {
    const { email, password, ref_code } = body
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' })
    try {
      const data = await vpsCall('POST', '/internal/user/register-email', { email, password, ref_code: ref_code || null })
      if (data.error) return res.status(400).json({ error: data.error })
      const token = await new SignJWT({ user_id: data.user_id })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(secret)
      return res.status(200).json({ token, user_id: data.user_id, session_id: data.session_id, account_code: data.account_code })
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── logout: no auth needed ───────────────────────────────────────────────
  if (action === 'logout') {
    const { session_id } = body
    if (session_id) {
      try { await vpsCall('POST', '/internal/session/logout', { session_id }) } catch {}
    }
    return res.status(200).json({ success: true })
  }

  // ── all other actions require JWT auth ────────────────────────────────────
  const user_id = await verifyToken(req)
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' })

  // ── setup: first-time password setup ─────────────────────────────────────
  if (action === 'setup') {
    const { password } = body
    if (!password || password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' })
    try {
      const data = await vpsCall('POST', `/internal/user/${user_id}/setup-password`, { password })
      if (data.error) return res.status(400).json({ error: data.error })
      return res.status(200).json({ success: true })
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── change-password ───────────────────────────────────────────────────────
  if (action === 'change-password') {
    const { old_password, new_password } = body
    if (!old_password || !new_password) return res.status(400).json({ error: 'old_password and new_password required' })
    if (new_password.length < 6) return res.status(400).json({ error: 'Новый пароль минимум 6 символов' })
    try {
      const data = await vpsCall('POST', `/internal/user/${user_id}/change-password`, { old_password, new_password })
      if (data.error) return res.status(400).json({ error: data.error })
      return res.status(200).json({ success: true })
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── link-telegram ─────────────────────────────────────────────────────────
  if (action === 'link-telegram') {
    const { code } = body
    if (!code) return res.status(400).json({ error: 'code required' })
    try {
      const data = await vpsCall('POST', `/internal/user/${user_id}/link-telegram`, { code })
      if (data.error) return res.status(400).json({ error: data.error })
      return res.status(200).json({ success: true, trial_granted: data.trial_granted || false, ...data })
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── push-subscribe ────────────────────────────────────────────────────────
  if (action === 'push-subscribe') {
    const { endpoint, p256dh, auth } = body
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: 'endpoint, p256dh, auth required' })
    try {
      const data = await vpsCall('POST', '/internal/push/subscribe', { user_id, endpoint, p256dh, auth })
      if (data.error) return res.status(400).json({ error: data.error })
      return res.status(200).json({ success: true })
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── register-device ──────────────────────────────────────────────────────
  if (action === 'register-device') {
    const { device_id, device_name } = body
    if (!device_id) return res.status(400).json({ error: 'device_id required' })
    try {
      const data = await vpsCall('POST', `/internal/user/${user_id}/devices`, { device_id, device_name: device_name || 'Устройство' })
      if (data.error) return res.status(400).json({ error: data.error })
      return res.status(200).json({ success: true })
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── remove-device ─────────────────────────────────────────────────────────
  if (action === 'remove-device') {
    const { device_id } = body
    if (!device_id) return res.status(400).json({ error: 'device_id required' })
    try {
      const data = await vpsCall('DELETE', `/internal/user/${user_id}/devices/${encodeURIComponent(device_id)}`)
      if (data.error) return res.status(400).json({ error: data.error })
      return res.status(200).json({ success: true })
    } catch (e) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(400).json({ error: 'Unknown action' })
}
