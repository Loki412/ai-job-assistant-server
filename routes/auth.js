import { Router } from 'express'
import { authLimiter } from '../middleware/rateLimit.js'
import { login } from '../controllers/authController.js'

const router = Router()

// Capped per IP: the endpoint exchanges a WeChat `code` for a session, so an
// unthrottled loop is both an abuse vector and a way to hammer the WeChat API.
router.post('/login', authLimiter, login)

export default router
