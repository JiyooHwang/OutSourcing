import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";

function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowedEmailsRaw = process.env.AUTH_ALLOWED_EMAILS ?? "";
  const allowedDomainsRaw = process.env.AUTH_ALLOWED_DOMAINS ?? "";

  const allowedEmails = allowedEmailsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowedDomains = allowedDomainsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  const lower = email.toLowerCase();

  if (allowedEmails.length === 0 && allowedDomains.length === 0) {
    return true;
  }
  if (allowedEmails.includes(lower)) return true;
  if (allowedDomains.some((d) => lower.endsWith(`@${d}`))) return true;
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
