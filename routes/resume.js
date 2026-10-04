import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { uploadLimiter } from '../middleware/rateLimit.js'
import {
  uploadResume, parseFile,
  saveResumeRecord, listResumeRecords,
  getResumeDetail, removeResume, generateAiResume
} from '../controllers/resumeController.js'

const router = Router()

// File handling is CPU-heavy (pdf-parse / mammoth), so both the authenticated
// upload and the public parse endpoint are capped per IP.
router.post('/upload', uploadLimiter, authMiddleware, uploadResume)
router.post('/parse', uploadLimiter, parseFile)
router.post('/save', authMiddleware, saveResumeRecord)
router.get('/list', authMiddleware, listResumeRecords)
router.get('/detail/:id', authMiddleware, getResumeDetail)
router.delete('/delete/:id', authMiddleware, removeResume)
router.post('/generate', authMiddleware, generateAiResume)

export default router
