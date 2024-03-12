// 使用Router方式
import express, { Response } from "express"
import { Request } from "express-jwt"

import { PrismaClient, User } from "@prisma/client"

import getAuth from "../utils/auth"
const api = express.Router()

api.use(express.json())
const prisma = new PrismaClient()

api.get("/teacher", async (req: Request, res: Response) => {
  const search = req.query.search as string
  //   const page = Number(req.query.page) || 1
  //   const perPage = Number(req.query.perPage) || 10
  //   const skip = (page - 1) * perPage
  //   const take = perPage
  // 分頁
  // 模糊搜尋
  // 獲取所有老師資訊
  const teachersCount = await prisma.teacher.count()
  // const teachers = await prisma.teacher.findMany({
  //   // skip,
  //   // take,
  //   orderBy: {
  //     createdAt: "desc"
  //   },
  //   select: {
  //     id: true,
  //     name: true,
  //     picture: true
  //   }
  // })
  const teachers = await prisma.teacher.findMany({
    where: {
      name: {
        contains: search
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      name: true,
      picture: true
    }
  })

  res.status(200).json({ msg: "獲取老師資訊成功", teachers, count: teachersCount })
})

api.get("/teacher/:id", async (req: Request, res: Response) => {
  const id = req.params.id
  // 獲取老師的所有課程資訊
  const teacher = await prisma.teacher.findUnique({
    where: {
      id
    },
    include: {
      Course: {
        include: {
          Review: {
            select: {
              rating: true
            }
          }
        }
      }
    }
  })

  const coursesInfo = teacher?.Course.map((course) => {
    const ratingLength = course.Review.length
    const totalRating = course.Review.reduce((acc, cur) => acc + cur.rating, 0)
    return {
      totalRating: ratingLength,
      averageRating: ratingLength === 0 ? 0 : (totalRating / ratingLength).toFixed(1)
    }
  })

  let teacherTotalRating = 0
  let teacherAverageRating: string | number = 0

  if (coursesInfo) {
    teacherTotalRating = coursesInfo.length
    teacherAverageRating =
      teacherTotalRating === 0
        ? 0
        : (
            coursesInfo?.reduce((acc, cur) => acc + Number(cur.averageRating), 0) /
            teacherTotalRating
          ).toFixed(1)
  }

  if (!teacher) {
    return res.status(404).json({ msg: "找不到老師" })
  }

  res.json({
    msg: "獲取老師資訊成功",
    teacher: {
      id: teacher?.id,
      name: teacher?.name,
      picture: teacher?.picture,
      email: teacher?.email,
      education: teacher?.education,
      expertise: teacher?.expertise,
      totalRating:
        coursesInfo?.map((course) => course.totalRating).reduce((acc, cur) => acc + cur, 0) || 0,
      averageRating: teacherAverageRating
    }
  })
})

// 新增老師資訊
api.post("/teacher", async (req: Request, res: Response) => {
  const auth = req.auth as User
  // 若不是 學號 D11019139 的使用者，則回傳 403 Forbidden
  const role = await getAuth(auth.id)
  if (role === "USER") {
    return res.status(403).json({ status: 403, msg: "權限不足" })
  }
  const teacher = req.body
  const newTeacher = await prisma.teacher.create({
    data: teacher
  })

  res.status(200).json({ msg: "新增老師資訊成功", teacher: newTeacher })
})

export default api

// 更新老師資訊
api.patch("/teacher", async (req: Request, res: Response) => {
  const auth = req.auth as User
  // 若不是 學號 D11019139 的使用者，則回傳 403 Forbidden
  console.log(auth.role)
  const role = await getAuth(auth.id)
  if (role === "USER") {
    return res.status(403).json({ status: 403, msg: "權限不足" })
  }
  const teacher = req.body

  const findTeacherId = await prisma.teacher.findUnique({
    where: {
      id: teacher.id
    },
    select: {
      teacherId: true
    }
  })

  const updatedTeacher = await prisma.teacher.update({
    where: {
      id: teacher.id
    },
    data: {
      teacherId: findTeacherId?.teacherId,
      ...teacher
    }
  })

  res.status(200).json({ msg: "更新老師資訊成功", teacher: updatedTeacher })
})
