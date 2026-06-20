import jwt from 'jsonwebtoken'
import config from '../config/index.js'

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未登录或登录已过期' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    req.userId = decoded.userId
    next()
  } catch (err) {
    return res.status(401).json({ message: '登录已过期，请重新登录' })
  }
}
