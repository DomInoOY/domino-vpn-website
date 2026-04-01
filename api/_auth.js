import { jwtVerify } from 'jose'

const JWT_SECRET = "domino-jwt-y8h3s1f4d7a2e5g0n9m6k3w1"
const secret = new TextEncoder().encode(JWT_SECRET)

export async function verifyToken(req) {
  const auth = req.headers.authorization || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.user_id
  } catch {
    return null
  }
}
