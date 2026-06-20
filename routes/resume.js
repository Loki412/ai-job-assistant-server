import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  uploadResume, parseFile,
  saveResumeRecord, listResumeRecords,
  getResumeDetail, removeResume, generateAiResume
} from '../controllers/resumeController.js'

const router = Router()

router.post('/upload', authMiddleware, uploadResume)
router.post('/parse', parseFile)
router.post('/save', authMiddleware, saveResumeRecord)
router.get('/list', authMiddleware, listResumeRecords)
router.get('/detail/:id', authMiddleware, getResumeDetail)
router.delete('/delete/:id', authMiddleware, removeResume)
router.post('/generate', authMiddleware, generateAiResume)

export default router
