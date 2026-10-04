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

    const wechatConfigured =
      Boolean(process.env.WX_APPID) && process.env.WX_APPID !== 'your_wechat_appid'

    if (wechatConfigured) {
      const wxRes = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APPID}&secret=${process.env.WX_SECRET}&js_code=${code}&grant_type=authorization_code`
      )
      const wxData = await wxRes.json()
      if (wxData.errcode) {
        return res.status(400).json({ message: '微信登录失败', error: wxData })
      }
      openid = wxData.openid
    } else {
      // Demo mode. Previously this was always `demo_${Date.now()}`, so every
      // single login produced a brand-new account and the caller could never
      // see their own saved resumes or history. If the client sends a stable
      // `deviceId` we reuse it, which makes the account persist across logins.
      const deviceId = req.body.deviceId || req.body.device_id
      openid = deviceId ? `demo_${deviceId}` : `demo_${Date.now()}`
      nickname = `用户${openid.slice(-6)}`

      console.warn(
        `[auth] WX_APPID is not configured — issuing a DEMO account (${openid}). ` +
        (deviceId
          ? 'Reusing the supplied deviceId.'
          : 'No deviceId was supplied, so a NEW account is created on every login and saved data will not be reachable.')
      )
    }

    let user = await findByOpenid(openid)

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
