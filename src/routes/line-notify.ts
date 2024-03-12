// 使用Router方式
import express, { Response } from "express"
import { Request } from "express-jwt"

import { User } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
const api = express.Router()

api.use(express.json())
const prisma = new PrismaClient()

// Line Notify 綁定
api.get("/line-notify", async (req: Request, res: Response) => {
  const code = req.query.code
  const state = req.query.state
  const error = req.query.error
  const errorDescription = req.query.error_description
  if (error) {
    return res.status(400).json({ msg: "Line Notify 綁定失敗", error, errorDescription })
  }
  if (!code || !state) {
    return res.status(400).json({ msg: "Line Notify 綁定失敗" })
  }
  console.log("code", code)
  const response = await fetch("https://notify-bot.line.me/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: process.env.LINE_NOTIFY_CALLBACK_URL as string,
      client_id: process.env.LINE_NOTIFY_CLIENT_ID as string,
      client_secret: process.env.LINE_NOTIFY_CLIENT_SECRET as string
    })
  })
  const data = await response.json()

  // 1 分鐘後過期
  res.cookie("lineNotifyToken", data.access_token, {
    domain: process.env.NODE_ENV === "production" ? ".sao-x.com" : "localhost",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 1000 * 60
  })

  res.redirect(
    `${process.env.FRONTEND_URL}/line-notify?type=line-notify&status=${data.status}&message=${data.message}`
  )
})

// Line Notify 傳送訊息
api.post("/line-notify", async (req: Request, res: Response) => {
  const user = req.auth as User
  const type = req.query.type
  if (type === "send") {
    const message = req.body.message

    const lineNotifySetting = await prisma.userSetting.findFirst({
      where: { userId: user.id }
    })
    if (!lineNotifySetting?.lineNotifyStatus || lineNotifySetting.lineNotifyToken === null) {
      return res.status(400).json({ msg: "Line Notify 未綁定" })
    }

    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${lineNotifySetting.lineNotifyToken}`
      },
      body: new URLSearchParams({ message })
    })
    const data = await response.json()

    if (response.ok) {
      res.json({ msg: "傳送訊息成功" })
    } else {
      res.status(400).json({ msg: `傳送訊息失敗: ${data.message}` })
    }
  } else {
    // 設定 Line Notify token
    const token = req.body.token
    console.log("user", user.id)
    console.log("lineNotifyToken", token)
    if (!token) {
      return res.status(400).json({ msg: "Line Notify 綁定失敗" })
    }
    try {
      // 更新使用者的 Line Notify token
      await prisma.userSetting.update({
        where: { userId: user.id },
        data: {
          lineNotifyToken: token,
          lineNotifyStatus: true
        }
      })
    } catch (error) {
      console.log("error", error)
      res.status(400).json({ msg: "Line Notify 綁定失敗" })
    }
    res.json({ msg: "Line Notify 綁定成功" })
  }
})

export default api
