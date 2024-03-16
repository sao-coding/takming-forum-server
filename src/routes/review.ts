// 使用Router方式
import express, { Response } from "express"
import { Request } from "express-jwt"

import { PrismaClient, User } from "@prisma/client"
const api = express.Router()

api.use(express.json())
const prisma = new PrismaClient()

// 顯示評論
api.get("/review", async (req: Request, res: Response) => {
  const type = req.query.type
  const courseId = req.query.course as string

  if (type === "count") {
    const auth = req.auth as User
    const reviewsCount = await prisma.review.count({
      where: {
        userId: auth.id
      }
    })
    return res.json({ msg: "獲取評論數量成功", count: reviewsCount })
  }

  if (type === "rank") {
    // 排名使用者評論的課程數量
    const rank = await prisma.review.groupBy({
      by: ["userId"],
      _count: {
        courseId: true
      },
      orderBy: {
        _count: {
          courseId: "desc"
        }
      }
    })

    // console.log("rank", rank)

    const rankWithUsername = await Promise.all(
      rank.map(async (user) => {
        const username = await prisma.userSetting.findUnique({
          where: {
            userId: user.userId
          },
          select: {
            username: true
          }
        })
        return {
          username: username?.username,
          // rank: rank.indexOf(user) + 1,
          // 若 留言數量跟上一個一樣，排名就一樣名次
          rank: rank.findIndex((item) => item._count.courseId === user._count.courseId) + 1,
          count: user._count.courseId
        }
      })
    )

    return res.json({ msg: "獲取評論排名成功", rank: rankWithUsername })
  }

  const comments = await prisma.review.findMany({
    where: {
      courseId
    },
    orderBy: {
      updatedAt: "desc"
    },
    // 獲取username
    include: {
      user: {
        select: {
          UserSetting: {
            select: {
              username: true
            }
          }
        }
      }
    }
  })

  const commentsWithUsername = comments.map((comment) => {
    return {
      id: comment.id,
      courseId: comment.courseId,
      userId: comment.userId,
      username: comment.user.UserSetting.map((setting) => setting.username)[0],
      rating: comment.rating,
      comment: comment.comment,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt
    }
  })

  res.json({ msg: "獲取評論成功", comments: commentsWithUsername })
})

// 新增評論 使用者若評論過就不能再評論
api.post("/review", async (req: Request, res: Response) => {
  // { courseId, rating: ratingValue, comment: courseComment.value }
  const auth = req.auth as User
  const { courseId, rating, comment } = req.body
  // 判斷這個使否已經在此課程中評論過
  const hasCommented = await prisma.review.findFirst({
    where: {
      courseId,
      userId: auth.id
    },
    select: {
      id: true
    }
  })

  if (hasCommented) {
    res.status(400).json({ msg: "已經評論過" })
    return
  }

  console.log("auth.id", auth.id)

  const newComment = await prisma.review.create({
    data: {
      courseId,
      rating,
      comment,
      userId: auth.id
    }
  })

  // 把課程的 updateAt 更新
  await prisma.course.update({
    where: {
      id: courseId
    },
    data: {
      updatedAt: new Date()
    }
  })

  // 把老師的 updateAt 更新
  const teacherId = await prisma.course.findUnique({
    where: {
      id: courseId
    },
    select: {
      teacherId: true
    }
  })

  await prisma.teacher.update({
    where: {
      id: teacherId?.teacherId
    },
    data: {
      updatedAt: new Date()
    }
  })

  res.json({ msg: "新增評論成功", comment: newComment })
})

// 更新評論 要同個使用者才能更新
api.patch("/review", async (req: Request, res: Response) => {
  const auth = req.auth as User
  const { id, courseId, comment } = req.body
  // 判斷是否為同個使用者
  const sameUser = await prisma.review.findUnique({
    where: {
      id,
      userId: auth.id
    },
    select: {
      id: true
    }
  })

  if (!sameUser) {
    res.status(401).json({ msg: "權限不足" })
    return
  }

  const updatedComment = await prisma.review.update({
    where: {
      id
    },
    data: {
      comment
    }
  })

  // 把課程的 updateAt 更新
  await prisma.course.update({
    where: {
      id: courseId
    },
    data: {
      updatedAt: new Date()
    }
  })

  // 把老師的 updateAt 更新
  const teacherId = await prisma.course.findUnique({
    where: {
      id: courseId
    },
    select: {
      teacherId: true
    }
  })

  await prisma.teacher.update({
    where: {
      id: teacherId?.teacherId
    },
    data: {
      updatedAt: new Date()
    }
  })

  res.json({ msg: "更新評論成功", comment: updatedComment })
})

// 刪除評論 要同個使用者才能刪除
api.delete("/review", async (req: Request, res: Response) => {
  const auth = req.auth as User
  const { id } = req.body
  // 判斷是否為同個使用者
  const sameUser = await prisma.review.findFirst({
    where: {
      id,
      userId: auth.id
    }
  })

  if (!sameUser) {
    res.status(401).json({ msg: "權限不足" })
    return
  }

  await prisma.review.delete({
    where: {
      id
    }
  })

  res.json({ msg: "刪除評論成功" })
})

export default api
