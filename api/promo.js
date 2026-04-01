import { verifyToken } from './_auth.js'
import { vpsCall } from './_vps.js'

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

  const userId = await verifyToken(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { code } = req.body || {}

  if (!code) {
    return res.status(400).json({ error: 'Promo code is required' })
  }

  try {
    const data = await vpsCall('POST', '/internal/promo/use', { user_id: userId, code })

    return res.status(200).json({
      success: data.success,
      days: data.days,
      error: data.error,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
