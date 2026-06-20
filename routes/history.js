import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  saveHistoryRecord, listHistoryRecords, listProjectGroups,
  getHistoryDetail, removeHistory
} from '../controllers/historyController.js'

const router = Router()

router.post('/save', authMiddleware, saveHistoryRecord)
router.get('/list', authMiddleware, listHistoryRecords)
router.get('/projects', authMiddleware, listProjectGroups)
router.get('/detail/:id', authMiddleware, getHistoryDetail)
router.delete('/delete/:id', authMiddleware, removeHistory)

export default router
