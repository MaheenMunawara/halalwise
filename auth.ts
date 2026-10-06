
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUsersCollection } from "@/lib/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) {
          return null;
        }

        const users = await getUsersCollection();

        const user = await users.findOne({ email });

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!passwordMatches) {
          return null;
        }

        const role =
          user.role === "finance_reviewer"
            ? "finance_reviewer"
            : "user";

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image ?? null,
          role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      // Refresh the role from MongoDB for existing JWT sessions.
      if (token.email) {
        const users = await getUsersCollection();

        const existingUser = await users.findOne({
          email: token.email.toLowerCase(),
        });

        token.role =
          existingUser?.role === "finance_reviewer"
            ? "finance_reviewer"
            : "user";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role ?? "user";
      }

      return session;
    },
  },

  trustHost: true,
});
