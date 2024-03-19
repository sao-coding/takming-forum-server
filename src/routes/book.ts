// 使用Router方式
import express, { Response } from "express"
import { Request } from "express-jwt"

import { User } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
const api = express.Router()

api.use(express.json())
const prisma = new PrismaClient()

// 此 api 不需要驗證
api.get("/book", async (req: Request, res: Response) => {
  const type = req.query.type
  const userId = req.query.userId
  const page = Number(req.query.page) || 1
  const perPage = Number(req.query.perPage) || 10
  const skip = (page - 1) * perPage
  const take = perPage
  // 分頁
  // 獲取所有書籍資訊 + 顯示User studentId

  if (type === "count" && userId) {
    // 使用者發布的二手書數量
    const booksCount = await prisma.book.count({
      where: {
        userId: userId as string
      }
    })
    return res.json({ msg: "獲取書籍數量成功", count: booksCount })
  }

  // 獲取書籍總數量
  const booksCount = await prisma.book.count()

  const books = await prisma.book.findMany({
    skip,
    take,
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      cover: true,
      title: true,
      category: true,
      price: true,
      sold: true,
      deliveryMethod: true,
      createdAt: true,
      user: {
        select: {
          studentId: true
        }
      }
    }
  })

  res.json({ msg: "獲取書籍資訊成功", books, count: booksCount })
})

api.get("/book/:id", async (req: Request, res: Response) => {
  const book = await prisma.book.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: {
          studentId: true,
          picture: true
        }
      }
    }
  })
  if (!book) {
    return res.status(404).json({ msg: "找不到書籍" })
  }
  res.json({ msg: "獲取書籍資訊成功", book })
})

api.post("/book", async (req: Request, res: Response) => {
  const { cover, title, author, isbn, price, publisher, category, deliveryMethod, content, sold } =
    req.body

  const auth = req.auth as User
  console.log("auth id", auth.id)
  const book = await prisma.book.create({
    data: {
      cover,
      title,
      author,
      isbn,
      price,
      publisher,
      category,
      deliveryMethod,
      content,
      sold,
      userId: auth.id
      // user: {
      //   connect: {
      //     id: auth.id
      //   }
      // }
    }
  })
  res.json({ msg: "新增書籍成功", book })
})

// 更新書籍資訊
api.put("/book/:id", async (req: Request, res: Response) => {
  const book = req.body

  const auth = req.auth as User
  const sameUser = await prisma.book.findUnique({
    where: {
      id: book.id,
      userId: auth.id
    },
    select: {
      userId: true
    }
  })

  if (!sameUser) {
    res.status(401).json({ msg: "權限不足" })
    return
  }

  const updatedBook = await prisma.book.update({
    where: {
      id: book.id
    },
    data: book
  })

  res.json({ msg: "更新書籍資訊成功", book: updatedBook })
})

// 更新書籍資訊 PATCH 必須是書籍擁有者才能更新
api.patch("/book", async (req: Request, res: Response) => {
  const book = req.body

  const auth = req.auth as User
  const sameUser = await prisma.book.findUnique({
    where: {
      id: book.id,
      userId: auth.id
    },
    select: {
      userId: true
    }
  })

  if (!sameUser) {
    res.status(401).json({ msg: "權限不足" })
    return
  }

  const updatedBook = await prisma.book.update({
    where: {
      id: book.id
    },
    data: book
  })

  res.json({ msg: "更新書籍資訊成功", book: updatedBook })
})

// 刪除書籍
api.delete("/book", async (req: Request, res: Response) => {
  const auth = req.auth as User
  const id = req.query.id as string

  if (!id) {
    res.status(400).json({ msg: "缺少書籍 id" })
    return
  }

  const book = await prisma.book.findUnique({
    where: {
      id
    },
    select: {
      userId: true
    }
  })

  if (!book || book.userId !== auth.id) {
    res.status(401).json({ msg: "權限不足" })
    return
  }

  await prisma.book.delete({
    where: {
      id
    }
  })

  res.json({ msg: "刪除書籍成功" })
})

export default api
