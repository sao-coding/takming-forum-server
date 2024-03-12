import { PrismaClient } from "@prisma/client"

const getAuth = async (id: string) => {
  const prisma = new PrismaClient()
  const user = await prisma.user.findUnique({
    where: {
      id
    },
    select: {
      role: true
    }
  })
  return user?.role
}

export default getAuth
