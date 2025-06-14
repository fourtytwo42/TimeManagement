import NextAuth from "next-auth"

// Local type definition to replace Prisma enum
type Role = 'STAFF' | 'MANAGER' | 'HR' | 'ADMIN'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
  }
} 