// 使用Router方式
import express, { Response } from "express"
import { Request } from "express-jwt"

import { PrismaClient, User } from "@prisma/client"

import getAuth from "../utils/auth"
const api = express.Router()

api.use(express.json())
const prisma = new PrismaClient()

// 查看某位教師的課程資訊
api.get("/course", async (req: Request, res: Response) => {
  const teacherId = req.query.teacher as string
  const courseId = req.query.course as string
  // 獲取該教師的所有課程資訊
  // 獲取課程評分array 做平均
  // 獲取評論數量
  if (teacherId) {
    const courses = await prisma.course.findMany({
      where: {
        teacherId
      },
      include: {
        Review: {
          select: {
            rating: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    const coursesInfo = courses.map((course) => {
      const ratingLength = course.Review.length
      const totalRating = course.Review.reduce((acc, cur) => acc + cur.rating, 0)
      return {
        id: course.id,
        name: course.name,
        teacherId: course.teacherId,
        totalRating: ratingLength,
        averageRating: ratingLength === 0 ? 0 : (totalRating / ratingLength).toFixed(1)
      }
    })

    res.json({
      msg: "獲取課程資訊成功",
      courses: coursesInfo
    })
  }
  if (courseId) {
    // 獲取老師名字
    // 獲取課程評分array 做平均
    const course = await prisma.course.findUnique({
      where: {
        id: courseId
      },
      include: {
        teacher: {
          select: {
            name: true
          }
        },
        Review: {
          select: {
            rating: true
          }
        }
      }
    })

    const ratingLength = course?.Review.length || 0

    const totalRating = course?.Review.reduce((acc, cur) => acc + cur.rating, 0) || 0

    res.json({
      msg: "獲取課程資訊成功",
      course: {
        id: course?.id,
        name: course?.name,
        teacherId: course?.teacherId,
        teacher: {
          name: course?.teacher.name
        },
        // 取到小數點第一位: course?.averageRating,
        averageRating: ratingLength === 0 ? 0 : (totalRating / ratingLength).toFixed(1)
      }
    })
  }
})

// 新增課程資訊
api.post("/course", async (req: Request, res: Response) => {
  const auth = req.auth as User
  // 若不是 學號 D11019139 的使用者，則回傳 403 Forbidden
  const role = await getAuth(auth.id)
  if (role === "USER") {
    return res.status(403).json({ msg: "權限不足" })
  }
  const course = req.body
  if (!course.name || !course.teacherId) {
    return res.status(400).json({ msg: "請填寫課名稱" })
  }
  const newCourse = await prisma.course.create({
    data: course
  })

  res.json({ msg: "新增課程資訊成功", course: newCourse })
})

export default api
