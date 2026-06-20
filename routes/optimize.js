import { Router } from 'express'
import { optimizeResume } from '../controllers/optimizeController.js'

const router = Router()

router.post('/optimize', optimizeResume)

export default router
