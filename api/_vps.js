const VPS_URL = process.env.VPS_URL || "http://162.248.163.147:5001"
const VPS_SECRET = process.env.VPS_INTERNAL_SECRET || "domino-internal-x7k2q9p4m8n3r5t1w0v6"

export async function vpsCall(method, path, body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": VPS_SECRET,
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${VPS_URL}${path}`, opts)
  return res.json()
}
