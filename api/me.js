import { verifyToken } from './_auth.js'
import { vpsCall } from './_vps.js'

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // server status (no auth)
  if (req.query.status === '1') {
    try {
      const data = await vpsCall('GET', '/internal/server/status')
      return res.status(200).json(data)
    } catch {
      return res.status(200).json({ status: 'online' })
    }
  }

  // subscription content proxy (no auth — sub_id is the secret token)
  if (req.query.sub_id) {
    const sub_id = req.query.sub_id
    try {
      const data = await vpsCall('GET', `/internal/sub/${encodeURIComponent(sub_id)}`)
      if (data.error || !data.content) return res.status(404).send('Not found')
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('Profile-Update-Interval', '12')
      return res.status(200).send(data.content)
    } catch {
      return res.status(502).send('Error')
    }
  }

  const userId = await verifyToken(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  // payment history
  if (req.query.payments === '1') {
    try {
      const data = await vpsCall('GET', `/internal/user/${userId}/payments`)
      return res.status(200).json(data)
    } catch {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // VAPID public key
  if (req.query.vapid === '1') {
    return res.status(200).json({ vapid_public_key: process.env.VAPID_PUBLIC_KEY || null })
  }

  // devices list
  if (req.query.devices === '1') {
    try {
      const data = await vpsCall('GET', `/internal/user/${userId}/devices`)
      return res.status(200).json(data)
    } catch {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // default: user profile
  try {
    const data = await vpsCall('GET', `/internal/user/${userId}`)
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
