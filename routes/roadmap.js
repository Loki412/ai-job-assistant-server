import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { generateRoadmapText } from '../controllers/roadmapController.js'

const router = Router()

// Public endpoint, auth optional — see routes/match.js for the rationale.
router.post('/generate', optionalAuth, generateRoadmapText)

export default router
