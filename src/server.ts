import cors from "cors"
import express, { Express, Response } from "express"
import { expressjwt, Request } from "express-jwt"
import jsonwebtoken from "jsonwebtoken"
import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import path from "path"
import favicon from "serve-favicon"

import { PrismaClient } from "@prisma/client"

import { api } from "./routes/api"

type User = {
  id: string
  displayName: string
  name: { familyName: string; givenName: string }
  emails: { value: string; verified: boolean }[]
  photos: { value: string }[]
  provider: string
  _raw: string
  _json: {
    sub: string
    name: string
    given_name: string
    family_name: string
    picture: string
    email: string
    email_verified: boolean
    locale: string
    hd: string
  }
}

const port = process.env.PORT || 3000
const secretKey = process.env.EXPRESS_SECRET_KEY as string
const prisma = new PrismaClient()
const app: Express = express()

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200
  })
)

app.use(
  expressjwt({
    secret: secretKey,
    algorithms: ["HS256"]
    // 只有在 /api 之後的路由才需要驗證
  }).unless({
    path: [
      "/",
      "/favicon.ico",
      "/auth/google",
      "/auth/callback/google",
      { url: "/api/post", methods: ["GET"] },
      { url: "/api/line-notify", methods: ["GET"] },
      { url: "/api/teacher", methods: ["GET"] },
      { url: "/api/book", methods: ["GET"] }
    ]
  })
)

// favicon: favicon.png
app.use(favicon(path.join(__dirname, "favicon.png")))

// 自訂預設路由路徑 /api
app.use("/api", api)

// public
// private

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string
    },
    (accessToken, refreshToken, profile, cb) => {
      return cb(null, profile)
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  if (user) {
    done(null, user)
  }
})

app.get("/", (req: Request, res: Response) => {
  // 德明論壇 API
  res.send(
    "<div style='text-align: center; margin-top: 100px;'><h1>德明論壇 API</h1><p>請使用 /api 進行存取</p></div>"
  )
})

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }))

app.get(
  "/auth/callback/google",
  passport.authenticate("google", { session: false }),
  async (req: Request, res: Response) => {
    // Successful authentication, redirect home.
    // console.log("req.user", req.user)
    const user = req.user as User

    // 查詢使用者是否存在 => 如果不存在就新增使用
    // prisma.user
    //   .findUnique({
    //     where: { email: user._json.email }
    //   })
    //   .then((data) => {
    //     if (data) {
    //       console.log("使用者已存在")
    //     } else {
    //       prisma.user
    //         .create({
    //           data: {
    //             name: user._json.name,
    //             givenName: user._json.given_name,
    //             familyName: user._json.family_name,
    //             picture: user._json.picture,
    //             email: user._json.email,
    //             locale: user._json.locale
    //           }
    //         })
    //         .then((data) => {
    //           console.log("使用者新增成功", data)
    //         })
    //     }
    //   })
    //   .catch((error) => {
    //     console.log("使用者新增失敗", error)
    //   })

    let userInfo

    const existUser = await prisma.user.findUnique({
      where: { email: user._json.email }
    })

    if (existUser) {
      console.log("使用者已存在")
      userInfo = existUser
    } else {
      const newUser = await prisma.user.create({
        data: {
          studentId: user._json.email.split("@")[0].toUpperCase(),
          name: user._json.name,
          givenName: user._json.given_name,
          familyName: user._json.family_name,
          picture: user._json.picture,
          email: user._json.email,
          locale: user._json.locale
        }
      })
      console.log("使用者新增成功", newUser)
      userInfo = newUser
      // 新增使用者設定
      await prisma.userSetting.create({
        data: {
          email: userInfo.email,
          user: {
            connect: {
              id: newUser.id
            }
          }
        }
      })
    }

    const token = jsonwebtoken.sign(userInfo, secretKey, { expiresIn: "7d" })

    // 回傳 cookie 給前端 http://localhost:5173 時間
    // res.cookie("token", token, { httpOnly: false, secure: false })
    // res.cookie("user", JSON.stringify(userInfo), { httpOnly: false, secure: false })
    res.cookie("token", token, {
      domain: process.env.NODE_ENV === "production" ? ".sao-x.com" : "localhost",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    })
    res.cookie("user", JSON.stringify(userInfo), {
      domain: process.env.NODE_ENV === "production" ? ".sao-x.com" : "localhost",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    })
    console.log("前端網址", process.env.FRONTEND_URL)
    res.redirect(process.env.FRONTEND_URL as string)
  }
)

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`)
})

export default app
