import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { Role } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  }
}

// Role-based middleware helpers
export function requireAuth(roles?: Role[]) {
  return async (req: any, res: any, next: any) => {
    // This would be used in API routes for role checking
    // Implementation depends on how we structure the API middleware
  }
}

export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole)
}

export function canAccessTimesheet(
  userRole: Role,
  userId: string,
  timesheetUserId: string,
  managerId?: string
): boolean {
  // Staff can only access their own timesheets
  if (userRole === Role.STAFF) {
    return userId === timesheetUserId
  }
  
  // Managers can access their direct reports' timesheets
  if (userRole === Role.MANAGER) {
    return userId === timesheetUserId || userId === managerId
  }
  
  // HR and Admin can access all timesheets
  return userRole === Role.HR || userRole === Role.ADMIN
} 