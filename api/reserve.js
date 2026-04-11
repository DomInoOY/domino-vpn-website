import { verifyToken } from './_auth.js'
import { vpsCall } from './_vps.js'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const userId = await verifyToken(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    // GET /api/reserve → reserve status
    const data = await vpsCall('GET', `/internal/reserve/status/${userId}`)
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    // POST /api/reserve → activate reserve
    const data = await vpsCall('POST', '/internal/reserve/activate', { user_id: userId })
    if (data.error) return res.status(400).json(data)
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
