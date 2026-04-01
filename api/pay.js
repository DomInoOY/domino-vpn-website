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

  const { plan_key, server } = req.body || {}

  if (!plan_key || !server) {
    return res.status(400).json({ error: 'plan_key and server are required' })
  }

  const validPlans = ['1month', '3months', '6months']
  const validServers = ['de', 'se']

  if (!validPlans.includes(plan_key)) {
    return res.status(400).json({ error: `plan_key must be one of: ${validPlans.join(', ')}` })
  }

  if (!validServers.includes(server)) {
    return res.status(400).json({ error: `server must be one of: ${validServers.join(', ')}` })
  }

  try {
    const data = await vpsCall('POST', '/internal/pay/create', { user_id: userId, plan_key, server })

    if (data.error) {
      return res.status(400).json({ error: data.error })
    }

    return res.status(200).json({
      payment_id: data.payment_id,
      pay_url: data.pay_url,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
