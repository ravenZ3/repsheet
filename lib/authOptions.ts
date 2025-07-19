// --- STEP 1: Change your imports ---
import { PrismaAdapter } from "@next-auth/prisma-adapter"
// REMOVE: import { PrismaClient } from "@prisma/client"
import prisma from "@/lib/prisma" // IMPORT the shared prisma instance instead
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { type NextAuthOptions } from "next-auth"
import type { SessionStrategy } from "next-auth"

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
  ],

  // --- STEP 3: ADD THIS ENTIRE `callbacks` OBJECT ---
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        // Add the user's database ID to the session object
        session.user.id = user.id;
      }
      return session;
    },
  },
  // --- END OF ADDITION ---
  
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "database" as SessionStrategy,
  },
  pages: {
    signIn: "/login",
  },
}