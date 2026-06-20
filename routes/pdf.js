import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { exportResumePdf } from '../controllers/pdfController.js'

const router = Router()

router.post('/resume', authMiddleware, exportResumePdf)

export default router
