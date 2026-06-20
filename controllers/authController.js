import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { findByOpenid, createUser } from '../services/userService.js'

export async function login(req, res) {
  const { code } = req.body

  if (!code) {
    return res.status(400).json({ message: '缺少登录凭证 code' })
  }

  try {
    let openid
    let nickname = ''
    let avatar = ''

    if (process.env.WX_APPID && process.env.WX_APPID !== 'your_wechat_appid') {
      const wxRes = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APPID}&secret=${process.env.WX_SECRET}&js_code=${code}&grant_type=authorization_code`
      )
      const wxData = await wxRes.json()
      if (wxData.errcode) {
        return res.status(400).json({ message: '微信登录失败', error: wxData })
      }
      openid = wxData.openid
    } else {
      openid = `demo_${Date.now()}`
      nickname = `用户${openid.slice(-6)}`
    }

    let user
    try {
      user = await findByOpenid(openid)
    } catch {
      user = null
    }

    if (!user) {
      user = await createUser(openid)
      if (nickname) {
        user.nickname = nickname
      }
    }

    const token = jwt.sign(
      { userId: user.id, openid: user.openid },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    res.json({
      token,
      userInfo: {
        id: user.id,
        nickname: user.nickname || nickname,
        avatar: user.avatar || ''
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: '登录失败，请稍后重试' })
  }
}
