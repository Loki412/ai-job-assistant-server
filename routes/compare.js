import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { compareResume } from '../controllers/compareController.js'

const router = Router()

router.post('/analyze', authMiddleware, compareResume)

export default router
