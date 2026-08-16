import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database", // works with the Prisma adapter's Session table
  },
  callbacks: {
    // Expose the DB user id on the session so API routes can attribute
    // ratings/photos without trusting a client-supplied id.
    async session({ session, user }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string }).id = user.id;
      }
      return session;
    },
  },
  pages: {
    // Using NextAuth's default sign-in screen for now — swap in a custom
    // page later if you want it to match the app's dark theme exactly.
  },
};
