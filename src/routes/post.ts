// 使用Router方式
import express, { Response } from "express"
import { Request } from "express-jwt"

import { User } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
const api = express.Router()

api.use(express.json())
const prisma = new PrismaClient()

api.get("/post", async (req: Request, res: Response) => {
  // const type = req.query.type
  const id = req.query.id
  // const auth = req.auth as User

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      anonymous: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          picture: true,
          UserSetting: {
            select: {
              username: true
            }
          }
        }
      }
    }
  })
  //   若 post anonymous 為 true，則不顯示 user 資訊
  const data = posts.map((post) => {
    if (post.anonymous) {
      return {
        ...post,
        user: null
      }
    }
    return post
  })

  if (id) {
    const post = await prisma.post.findUnique({
      where: {
        id: id as string
      },
      select: {
        id: true,
        title: true,
        content: true,
        anonymous: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            picture: true
          }
        }
      }
    })

    if (post?.anonymous) {
      post.user = {
        id: post.user.id,
        name: "匿名",
        picture: ""
      }
    }

    return res.json({ msg: "取得文章成功", post })
  }

  res.json({ msg: "取得文章成功", posts: data })
})

api.post("/post", async (req: Request, res: Response) => {
  // const type = req.query.type
  const auth = req.auth as User

  const { title, content, anonymous } = req.body

  if (title === "") {
    res.status(400).send("標題不得為空")
    return
  }

  if (content === "") {
    res.status(400).send("內容不得為空")
    return
  }

  const post = await prisma.post.create({
    data: {
      title,
      content,
      anonymous,
      user: {
        connect: {
          id: auth.id
        }
      }
    }
  })

  res.json({ msg: "新增文章成功", post })
})

export default api
