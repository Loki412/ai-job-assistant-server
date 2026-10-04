import rateLimit from 'express-rate-limit'

/**
 * Rate limiters.
 *
 * Every AI-backed endpoint spends real money per call (DeepSeek tokens) and
 * several of them are intentionally reachable without login. Without a limiter
 * anyone who finds the URL can loop the endpoint and drain the account balance.
 *
 * Limits are keyed by client IP. `app.set('trust proxy', 1)` in app.js makes
 * express-rate-limit read the real client IP from X-Forwarded-For instead of
 * the reverse-proxy address, so all callers would otherwise share one bucket.
 */

const jsonHandler = (req, res) => {
  res.status(429).json({
    message: '请求过于频繁，请稍后再试',
    retryAfterSeconds: Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 60
  })
}

// AI endpoints: tighter window because each call costs tokens.
// 20 requests per 5 minutes per IP is generous for a single user driving the UI,
// but stops scripted abuse.
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
  // Health probes and preflight must never be throttled.
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health'
})

// Auth endpoint: guards against brute-forcing / code enumeration.
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
  skip: (req) => req.method === 'OPTIONS'
})

// File parse/upload: CPU heavy (pdf-parse / mammoth), so cap harder.
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler,
  skip: (req) => req.method === 'OPTIONS'
})
