import express from 'express'
import cors from 'cors'
import config from './config/index.js'
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

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/resume', resumeRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/match', matchRoutes)
app.use('/api/roadmap', roadmapRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/optimize', optimizeRoutes)
app.use('/api/pdf', pdfRoutes)
app.use('/api/compare', compareRoutes)
app.use('/api/recommend', recommendRoutes)
app.use('/api/salary', salaryRoutes)
app.use('/api/ats', atsRoutes)

app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ message: err.message || '服务器内部错误' })
})

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
})
