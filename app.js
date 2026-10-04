import express from 'express'
import cors from 'cors'
import config from './config/index.js'
import { aiLimiter } from './middleware/rateLimit.js'
import { flush as flushStore } from './services/localStore.js'
import authRoutes from './routes/auth.js'
import resumeRoutes from './routes/resume.js'
import aiRoutes from './routes/ai.js'
import matchRoutes from './routes/match.js'
import roadmapRoutes from './routes/roadmap.js'
import historyRoutes from './routes/history.js'
import optimizeRoutes from './routes/optimize.js'
import pdfRoutes from './routes/pdf.js'
import compareRoutes from './routes/compare.js'
import recommendRoutes from './routes/recommend.js'
import salaryRoutes from './routes/salary.js'
import atsRoutes from './routes/ats.js'

const app = express()

// Trust the reverse proxy in front of the app (deployment sandbox terminates TLS)
app.set('trust proxy', 1)

// Never advertise the framework in responses
app.disable('x-powered-by')

// CORS: allow the documented origins, or all when CORS_ORIGIN is unset.
// Same-origin requests and curl/server-to-server calls are always allowed.
const corsOrigin = process.env.CORS_ORIGIN
app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map(s => s.trim()) } : {}))

// Resume text / JD payloads can be large, keep a sane explicit ceiling
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// Minimal access log — method, path, status, duration. Helps diagnose 5xx in the
// platform log viewer without pulling in a logging dependency.
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
})

// Lightweight liveness probe. Also reports which optional integrations are
// configured, as booleans only — never the values — so a misconfigured deploy
// can be diagnosed by opening this URL in a browser.
app.get('/health', (req, res) => {
  const key = process.env.DEEPSEEK_API_KEY
  const jwt = process.env.JWT_SECRET
  const supabaseUrl = process.env.SUPABASE_URL

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    config: {
      ai: Boolean(key) && !key.startsWith('your_'),
      jwtSecretIsSecure: Boolean(jwt) && jwt !== 'default_secret' && !jwt.startsWith('your_'),
      supabase: Boolean(supabaseUrl) && !supabaseUrl.includes('your-project'),
      wechatLogin: Boolean(process.env.WX_APPID) && process.env.WX_APPID !== 'your_wechat_appid'
    }
  })
})

// Root route: the share link is opened directly in a browser, so give it a
// readable service card instead of a bare 404.
app.get('/', (req, res) => {
  res.json({
    name: 'AI 求职助手 · 服务端 API',
    status: 'running',
    uptime: Math.round(process.uptime()),
    health: '/health',
    endpoints: [
      'POST /api/auth/login',
      'POST /api/resume/parse',
      'POST /api/resume/upload',
      'POST /api/resume/generate',
      'POST /api/ai/analyze-text',
      'POST /api/ats/score',
      'POST /api/match/analyze',
      'POST /api/optimize/optimize',
      'POST /api/roadmap/generate',
      'POST /api/compare/analyze',
      'POST /api/recommend/jobs',
      'POST /api/salary/query',
      'POST /api/pdf/resume',
      'GET  /api/history/list'
    ]
  })
})

// AI-backed routes get a shared rate limit: they cost real tokens per call,
// so an unauthenticated loop would burn the account balance.
app.use('/api/ai', aiLimiter, aiRoutes)
app.use('/api/match', aiLimiter, matchRoutes)
app.use('/api/roadmap', aiLimiter, roadmapRoutes)
app.use('/api/optimize', aiLimiter, optimizeRoutes)
app.use('/api/compare', aiLimiter, compareRoutes)
app.use('/api/ats', aiLimiter, atsRoutes)

app.use('/api/auth', authRoutes)
app.use('/api/resume', resumeRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/pdf', pdfRoutes)
app.use('/api/recommend', recommendRoutes)
app.use('/api/salary', salaryRoutes)

// 404 fallback for unknown API paths (keeps JSON contract consistent)
app.use((req, res) => {
  res.status(404).json({ message: `接口不存在: ${req.method} ${req.path}` })
})

app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ message: err.message || '服务器内部错误' })
})

// Bind 0.0.0.0 so the platform reverse proxy can reach the container,
// and honour the injected PORT instead of a hard-coded value.
const PORT = Number(process.env.PORT) || config.port || 3000
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.startsWith('your_')) {
    console.warn('[config] DEEPSEEK_API_KEY is not set — AI endpoints will return errors')
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('your_')) {
    console.warn('[config] JWT_SECRET is using the insecure default — change it in production')
  }
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
    console.warn('[config] Supabase not configured — falling back to file storage (data/persist.json)')
  }
})

// Graceful shutdown so the platform can recycle the instance cleanly
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down...`)
    // Persist any debounced writes before the process goes away.
    flushStore()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 8000).unref()
  })
}

export default app
