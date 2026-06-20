import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { scoreATS } from '../controllers/atsController.js'

const router = Router()

router.post('/score', authMiddleware, scoreATS)

export default router
