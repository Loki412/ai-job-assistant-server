import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { analyzeMatchText } from '../controllers/matchController.js'

const router = Router()

// Public endpoint (called before login by the client), so auth is optional:
// a valid token enriches the result with history, an absent one still works.
router.post('/analyze', optionalAuth, analyzeMatchText)

export default router
