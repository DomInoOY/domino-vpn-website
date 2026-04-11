import { vpsCall } from './_vps.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'GET' || req.method === 'POST') {
    // Verify cron secret
    const authHeader = req.headers['authorization']
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const data = await vpsCall('POST', '/internal/push/send-expiry', { days: 3 })
      return res.status(200).json(data)
    } catch (err) {
      return res.status(500).json({ error: 'Failed to send push notifications' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
