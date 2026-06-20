import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { recommendJobs } from '../controllers/recommendController.js'

const router = Router()

router.post('/jobs', authMiddleware, recommendJobs)

export default router
