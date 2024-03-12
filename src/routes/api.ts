// 使用Router方式
import express from "express"

import apiBook from "./book"
import apiCourse from "./course"
import apiLineNotify from "./line-notify"
import apiComment from "./review"
import apiTeacher from "./teacher"
import apiUser from "./user"

export const api = express.Router()
api.use(express.json())
api.use("/", apiUser)
api.use("/", apiLineNotify)
api.use("/", apiBook)
api.use("/", apiTeacher)
api.use("/", apiCourse)
api.use("/", apiComment)
