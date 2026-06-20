import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { querySalary } from '../controllers/salaryController.js'

const router = Router()

router.post('/query', authMiddleware, querySalary)

export default router
