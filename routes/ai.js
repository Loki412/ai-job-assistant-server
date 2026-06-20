import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { analyze, analyzeText } from '../controllers/aiController.js'

const router = Router()

router.post('/analyze', authMiddleware, analyze)
router.post('/analyze-text', analyzeText)

export default router
