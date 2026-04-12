// --- STEP 1: Change your imports ---
import { PrismaAdapter } from "@next-auth/prisma-adapter"
// REMOVE: import { PrismaClient } from "@prisma/client"
import prisma from "@/lib/prisma" // IMPORT the shared prisma instance instead
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { type NextAuthOptions } from "next-auth"
import bcrypt from "bcryptjs"

// --- STEP 2: Remove this line ---
// const prisma = new PrismaClient() // This line is now gone

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Now uses the shared instance
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
        const user = (await prisma.user.findUnique({
          where: { email: credentials.email },
        })) as unknown as { password?: string | null; id: string } | null;
        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }
        return user;
      }
    }),
  ],

  // --- STEP 3: ADD THIS ENTIRE `callbacks` OBJECT ---
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