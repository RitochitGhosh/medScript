import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Mock doctor for demo
const MOCK_DOCTOR = {
  id: "doctor-1",
  email: "doctor@medscript.ai",
  password: "password123",
  name: "Dr. Priya Sharma",
  specialization: "General Medicine",
  clinicName: "MedScript Clinic, Mumbai",
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (
          credentials.email === MOCK_DOCTOR.email &&
          credentials.password === MOCK_DOCTOR.password
        ) {
          return {
            id: MOCK_DOCTOR.id,
            email: MOCK_DOCTOR.email,
            name: MOCK_DOCTOR.name,
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token["id"] = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id: string }).id = token["id"] as string;
      }
      return session;
    },
  },
  secret: process.env["NEXTAUTH_SECRET"],
};
