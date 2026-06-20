import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { generateRoadmap, generateRoadmapText } from '../controllers/roadmapController.js'

const router = Router()

router.post('/generate', generateRoadmapText)

export default router
