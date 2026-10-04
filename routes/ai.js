import { Router } from 'express'
import authMiddleware, { optionalAuth } from '../middleware/auth.js'
import { analyze, analyzeText } from '../controllers/aiController.js'

const router = Router()

// Requires login: reads a stored resume by id.
router.post('/analyze', authMiddleware, analyze)

// Stays reachable without login (the client calls it before auth), but picks up
// the user when a token is supplied so history can still be recorded.
router.post('/analyze-text', optionalAuth, analyzeText)

export default router
