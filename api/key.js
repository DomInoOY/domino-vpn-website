import { verifyToken } from './_auth.js'
import { vpsCall } from './_vps.js'

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await verifyToken(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const data = await vpsCall('GET', `/internal/key/${userId}`)

    if (data.error) {
      return res.status(400).json({ error: data.error })
    }

    return res.status(200).json({
      sub_url: data.sub_url,
      server: data.server,
      server_name: data.server_name,
      expires_at: data.expires_at,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
