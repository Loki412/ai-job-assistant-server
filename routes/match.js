import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { analyzeMatch, analyzeMatchText } from '../controllers/matchController.js'

const router = Router()

router.post('/analyze', analyzeMatchText)

export default router
