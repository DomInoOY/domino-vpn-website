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

  const { server, device_id } = req.body || {}

  if (!server) {
    return res.status(400).json({ error: 'server is required' })
  }

  const validServers = ['de', 'se']
  if (!validServers.includes(server)) {
    return res.status(400).json({ error: `server must be one of: ${validServers.join(', ')}` })
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || ''

  try {
    const data = await vpsCall('POST', '/internal/trial/activate', {
      user_id: userId,
      server,
      device_id: device_id || '',
      ip_address: ip,
    })

    if (data.error) {
      return res.status(400).json({ error: data.error })
    }

    return res.status(200).json({
      success: data.success,
      sub_url: data.sub_url,
      expires_at: data.expires_at,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
