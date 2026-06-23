import { Router } from 'express'
import multer from 'multer'
import { exportResumePdf } from '../controllers/pdfController.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/resume', upload.none(), exportResumePdf)

export default router
