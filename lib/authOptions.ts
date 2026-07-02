import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { type NextAuthOptions } from "next-auth"
import bcrypt from "bcryptjs"
import { rateLimit } from "@/lib/rateLimit"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }
        // Throttle per email: bcrypt makes each attempt expensive, and
        // unthrottled tries are a brute-force / enumeration vector.
        const limited = rateLimit(`login:${credentials.email.toLowerCase()}`, 5, 60_000);
        if (!limited.ok) {
          throw new Error("Too many login attempts. Try again shortly.");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: { id: true, password: true },
        });
        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }
        return { id: user.id };
      }
    }),
  ],

  // Copy the user id onto the JWT (and from there onto the session) so API
  // routes can authorize by session.user.id.
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
}
