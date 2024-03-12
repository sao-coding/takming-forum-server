// 使用Router方式
import express, { Response } from "express"
import { Request } from "express-jwt"

import { User } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
const api = express.Router()

api.use(express.json())
const prisma = new PrismaClient()

api.get("/user", async (req: Request, res: Response) => {
  const type = req.query.type
  const auth = req.auth as User
  if (type === "settings") {
    // 若有 LineNotifyToken 則回傳 true 否則回傳 false
    const contact = await prisma.userSetting.findUnique({
      where: { userId: auth.id }
    })

    const contactInfo = {
      lineNotifyStatus: contact?.lineNotifyStatus,
      lineNotifyToken: contact?.lineNotifyToken ? true : false,
      username: contact?.username,
      email: contact?.email,
      phone: contact?.phone,
      lineId: contact?.lineId,
      igId: contact?.igId
    }

    res.json({ status: 200, msg: "獲取使用者聯絡方式成功", contact: contactInfo })
  } else if (type === "auth") {
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true
      }
    })
    if (!user) {
      return res.status(400).json({ status: 400, msg: "找不到使用者" })
    }

    res.json({ status: 200, msg: "獲取使用者資訊成功", user })
  } else {
    const user = await prisma.user.findUnique({
      where: { id: auth.id }
    })
    if (!user) {
      return res.status(400).json({ status: 400, msg: "找不到使用者" })
    }

    res.json({ status: 200, msg: "獲取使用者資訊成功", user })
  }
})

api.put("/user", async (req: Request, res: Response) => {
  const type = req.query.type
  const auth = req.auth as User

  if (type === "settings") {
    const { lineNotifyStatus, username, email, phone, lineId, igId } = req.body
    const contact = await prisma.userSetting.update({
      where: { userId: auth.id },
      data: {
        lineNotifyStatus,
        username,
        email,
        phone,
        lineId,
        igId
      }
    })
    res.json({ status: 200, msg: "更新使用者聯絡方式成功", contact })
  } else {
    res.json({ status: 400, msg: "找不到對應的路由" })
  }
})

export default api
