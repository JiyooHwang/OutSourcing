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

function getAdminEmails(): string[] {
  return (process.env.AUTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
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
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
        const adminEmails = getAdminEmails();
        const lower = (user.email ?? "").toLowerCase();

        let dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (
          dbUser &&
          adminEmails.includes(lower) &&
          dbUser.role !== "ADMIN"
        ) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { role: "ADMIN" },
          });
        }
        token.role = dbUser?.role ?? "MEMBER";
      }

      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "MEMBER") ?? "MEMBER";
      }
      return session;
    },
  },
});
