import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { optimizeResume } from '../controllers/optimizeController.js'

const router = Router()

// Public endpoint, auth optional — see routes/match.js for the rationale.
router.post('/optimize', optionalAuth, optimizeResume)

export default router
