import jwt from 'jsonwebtoken'
import config from '../config/index.js'

/**
 * Token sources, tried in order. `authorization` stays first so existing
 * clients keep working unchanged; the extra headers exist because the public
 * deploy host sits behind a gateway that rewrites `authorization` (it arrives
 * as a Bearer token we did not send), which makes the client's own token
 * unreachable. See DEPLOYMENT.md -> "认证头".
 *
 * A request may carry tokens in several sources at once, so we try each until
 * one verifies instead of trusting a single header.
 */
const ALTERNATE_TOKEN_HEADERS = ['x-auth-token', 'x-access-token', 'x-token']

function collectCandidates(req) {
  const candidates = []

  const authorization = req.headers.authorization
  if (typeof authorization === 'string' && authorization.trim()) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
    candidates.push({ source: 'authorization', token: match ? match[1] : '' })
  }

  for (const header of ALTERNATE_TOKEN_HEADERS) {
    const value = req.headers[header]
    if (typeof value === 'string' && value.trim()) {
      const token = value.trim().replace(/^Bearer\s+/i, '')
      if (token) candidates.push({ source: header, token })
    }
  }

  return candidates
}

/**
 * Verify the first candidate that validates. Never throws.
 * Returns { decoded, source, candidates } where `decoded` is null on failure.
 */
function authenticate(req) {
  const candidates = collectCandidates(req)
  for (const candidate of candidates) {
    if (!candidate.token) continue
    try {
      return { decoded: jwt.verify(candidate.token, config.jwt.secret), source: candidate.source, candidates }
    } catch {
      // Try the next source.
    }
  }
  return { decoded: null, source: null, candidates }
}

/**
 * Diagnostic payload for 401 responses, gated behind AUTH_DEBUG=1.
 * Reports which sources arrived and their lengths — never the token itself —
 * so a failing deploy can be diagnosed from the outside.
 */
function authDebug(candidates) {
  return {
    sources: candidates.map(c => ({ source: c.source, length: c.token.length })),
    expectedTokenLength: 221,
  }
}

/**
 * Strict auth: rejects the request when no valid token is present.
 * Use for anything acting on a specific user's data.
 */
export default function authMiddleware(req, res, next) {
  const { decoded, candidates } = authenticate(req)

  if (!decoded) {
    const body = { message: '登录已过期，请重新登录' }
    if (process.env.AUTH_DEBUG === '1') body.debug = authDebug(candidates)
    return res.status(401).json(body)
  }

  req.userId = decoded.userId
  next()
}

/**
 * Optional auth: attaches req.userId when a valid token is present, but never
 * blocks the request.
 *
 * Used by the AI endpoints that were deliberately left public (the mini-program
 * client can call them before login). They still want to save history when the
 * caller happens to be logged in — see the `if (req.userId)` guards in the
 * controllers. Hard-requiring auth here would break that client, so we soften
 * it instead and rely on `middleware/rateLimit.js` to stop abuse.
 */
export function optionalAuth(req, res, next) {
  const { decoded } = authenticate(req)
  if (decoded) req.userId = decoded.userId
  next()
}
